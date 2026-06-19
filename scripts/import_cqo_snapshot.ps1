param(
  [string]$CqoFile = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$timestamp] $message"
}

function Get-ConfigValue($name, $fallback = "") {
  $value = [Environment]::GetEnvironmentVariable($name, "User")
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($name, "Machine")
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($name)
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $fallback
  }
  return $value
}

function Get-DefaultCqoFile() {
  $tecnicaDir = Get-ChildItem -LiteralPath "E:\" -Directory |
    Where-Object { $_.Name -like "T*CNICA" } |
    Select-Object -First 1

  if ($null -eq $tecnicaDir) {
    throw "Pasta tecnica nao encontrada em E:\."
  }

  $qualidadeDir = Get-ChildItem -LiteralPath $tecnicaDir.FullName -Directory |
    Where-Object { $_.Name -like "Qualidade Agr*cola" } |
    Select-Object -First 1

  if ($null -eq $qualidadeDir) {
    throw "Pasta Qualidade Agricola nao encontrada em $($tecnicaDir.FullName)."
  }

  $file = Get-ChildItem -LiteralPath $qualidadeDir.FullName -File -Filter "*.xlsx" |
    Where-Object { $_.Name -like "1_Digita*CQO.xlsx" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($null -eq $file) {
    throw "Arquivo 1_Digitacao_CQO.xlsx nao encontrado em $($qualidadeDir.FullName)."
  }

  return $file.FullName
}

function Normalize-Header($value, $index) {
  $text = [string]$value
  $text = $text.Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return "coluna_$index"
  }
  return $text
}

function Convert-ExcelDate($value) {
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace("$value")) {
    return $null
  }

  try {
    if ($value -is [datetime]) {
      return $value.ToString("yyyy-MM-dd")
    }

    $number = [double]$value
    return ([datetime]"1899-12-30").AddDays($number).ToString("yyyy-MM-dd")
  }
  catch {
    return "$value"
  }
}

function Normalize-Parcel($value) {
  $text = [string]$value
  $text = $text.Trim().ToUpperInvariant()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return ""
  }

  $compact = ($text -replace "\s+", "")
  $compact = ($compact -replace ",", ".")

  if ($compact -match "^([A-Z]+)[\.-]?0*(\d+)") {
    return "$($matches[1])-$([int]$matches[2])"
  }

  return $compact
}

function Convert-CellValue($value) {
  if ($null -eq $value) {
    return $null
  }

  if ($value -is [datetime]) {
    return $value.ToString("yyyy-MM-dd")
  }

  if ($value -is [double] -or $value -is [int] -or $value -is [decimal]) {
    return $value
  }

  $text = "$value".Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }
  return $text
}

function Get-RowValue($item, $patterns) {
  foreach ($pattern in $patterns) {
    foreach ($key in $item.Keys) {
      if ($key -like $pattern) {
        return $item[$key]
      }
    }
  }
  return $null
}

function Has-RequiredCqoFields($item) {
  return -not [string]::IsNullOrWhiteSpace([string](Get-RowValue $item @("NomeFazenda"))) `
    -and -not [string]::IsNullOrWhiteSpace([string](Get-RowValue $item @("Parcela"))) `
    -and -not [string]::IsNullOrWhiteSpace([string](Get-RowValue $item @("DataAval*")))
}

function Add-NormalizedFields($item, $sheetName, $rowNumber) {
  $parcelaOriginal = [string](Get-RowValue $item @("Parcela"))

  $item["linha_excel"] = $rowNumber
  $item["aba_origem"] = $sheetName
  $item["parcela_original"] = $parcelaOriginal
  $item["parcela_normalizada"] = Normalize-Parcel $parcelaOriginal
  $item["data_avaliacao_iso"] = Convert-ExcelDate (Get-RowValue $item @("DataAval*"))

  $mesValue = Get-RowValue $item @("Mes", "M?s", "Mês")
  if ($null -ne $mesValue) { $item["mes_referencia_iso"] = Convert-ExcelDate $mesValue }

  $dataRealValue = Get-RowValue $item @("DataReal")
  if ($null -ne $dataRealValue) { $item["data_real_iso"] = Convert-ExcelDate $dataRealValue }

  return $item
}

function Read-ExcelSheetRows($filePath, $sheetName) {
  $excel = $null
  $workbook = $null

  try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $workbook = $excel.Workbooks.Open($filePath, $null, $true)
    $worksheet = $null
    foreach ($sheet in $workbook.Worksheets) {
      if ($sheet.Name -eq $sheetName) {
        $worksheet = $sheet
        break
      }
    }
    if ($null -eq $worksheet) {
      throw "A aba '$sheetName' nao foi encontrada em $filePath."
    }

    $range = $worksheet.UsedRange
    $colCount = $range.Columns.Count
    $rowCount = 1
    foreach ($requiredCol in @(2, 3, 4)) {
      $lastRequiredRow = $worksheet.Cells.Item($worksheet.Rows.Count, $requiredCol).End(-4162).Row
      if ($lastRequiredRow -gt $rowCount) {
        $rowCount = $lastRequiredRow
      }
    }

    $readRange = $worksheet.Range(
      $worksheet.Cells.Item(1, 1),
      $worksheet.Cells.Item($rowCount, $colCount)
    )
    $values = $readRange.Value2

    if ($rowCount -lt 2 -or $colCount -lt 1) {
      return @{ Columns = @(); Rows = @() }
    }

    $columns = @()
    for ($col = 1; $col -le $colCount; $col++) {
      $columns += Normalize-Header $values[1, $col] $col
    }

    $rows = @()
    for ($row = 2; $row -le $rowCount; $row++) {
      $item = [ordered]@{}

      for ($col = 1; $col -le $colCount; $col++) {
        $item[$columns[$col - 1]] = Convert-CellValue $values[$row, $col]
      }

      if (Has-RequiredCqoFields $item) {
        $rows += [pscustomobject](Add-NormalizedFields $item $sheetName $row)
      }
    }

    return @{ Columns = $columns; Rows = $rows }
  }
  finally {
    if ($null -ne $workbook) {
      $workbook.Close($false) | Out-Null
    }
    if ($null -ne $excel) {
      $excel.Quit() | Out-Null
    }

    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
  }
}

$supabaseRestUrl = Get-ConfigValue "CQO_SUPABASE_REST_URL" (Get-ConfigValue "HEADCOUNT_SUPABASE_REST_URL" "https://wcifxyvesmhqurqhnway.supabase.co/rest/v1")
$supabaseKey = Get-ConfigValue "CQO_SUPABASE_KEY" (Get-ConfigValue "HEADCOUNT_SUPABASE_KEY")

if (-not $DryRun -and [string]::IsNullOrWhiteSpace($supabaseKey)) {
  throw "Configure a variavel de usuario CQO_SUPABASE_KEY ou HEADCOUNT_SUPABASE_KEY com a chave do Supabase antes de enviar."
}

if ([string]::IsNullOrWhiteSpace($CqoFile)) {
  $CqoFile = Get-DefaultCqoFile
}

if (-not (Test-Path -LiteralPath $CqoFile)) {
  throw "Arquivo nao encontrado: $CqoFile"
}

$file = Get-Item -LiteralPath $CqoFile

Write-Step "Arquivo selecionado: $($file.FullName)"
Write-Step "Lendo aba: corte"
$corte = Read-ExcelSheetRows $file.FullName "corte"

Write-Step "Lendo aba: carreamento"
$carreamento = Read-ExcelSheetRows $file.FullName "carreamento"

$payload = [ordered]@{
  import_key = "cqo_1_digitacao_cqo"
  fonte = "excel_1_digitacao_cqo"
  source_file = $file.Name
  source_path = $file.FullName
  file_last_write_time = $file.LastWriteTime.ToUniversalTime().ToString("o")
  corte_total_rows = $corte.Rows.Count
  carreamento_total_rows = $carreamento.Rows.Count
  corte_columns_json = $corte.Columns
  carreamento_columns_json = $carreamento.Columns
  corte_rows_json = $corte.Rows
  carreamento_rows_json = $carreamento.Rows
  imported_at = (Get-Date).ToUniversalTime().ToString("o")
  updated_at = (Get-Date).ToUniversalTime().ToString("o")
}

Write-Step "Linhas corte lidas: $($corte.Rows.Count)"
Write-Step "Linhas carreamento lidas: $($carreamento.Rows.Count)"
Write-Step "Regra parcela: valor original preservado e parcela_normalizada sem sufixo decimal. Ex: F10.1 vira F-10."

if ($DryRun) {
  Write-Step "Dry-run ativo. Nada foi enviado ao Supabase."
  $previewPath = Join-Path $PSScriptRoot "cqo_snapshot_preview.json"
  $payload | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $previewPath -Encoding UTF8
  Write-Step "Preview salvo em: $previewPath"
  exit 0
}

$uri = "$supabaseRestUrl/cqo_import_snapshots?on_conflict=import_key"
$headers = @{
  "apikey" = $supabaseKey
  "Authorization" = "Bearer $supabaseKey"
  "Content-Type" = "application/json"
  "Prefer" = "resolution=merge-duplicates,return=minimal"
}

Write-Step "Enviando snapshot para Supabase..."
$jsonBody = $payload | ConvertTo-Json -Depth 100 -Compress
$lastPayloadPath = Join-Path $PSScriptRoot "cqo_snapshot_last_payload.json"
$jsonBody | Set-Content -LiteralPath $lastPayloadPath -Encoding UTF8
$utf8Body = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

try {
  Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $utf8Body | Out-Null
}
catch {
  $responseText = ""
  try {
    $stream = $_.Exception.Response.GetResponseStream()
    if ($null -ne $stream) {
      $reader = New-Object System.IO.StreamReader($stream)
      $responseText = $reader.ReadToEnd()
    }
  } catch {
    $responseText = ""
  }

  if (-not [string]::IsNullOrWhiteSpace($responseText)) {
    throw "Falha no envio ao Supabase: $responseText"
  }
  throw
}

Write-Step "Importacao CQO concluida com sucesso."
