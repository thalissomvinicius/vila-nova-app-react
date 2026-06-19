param(
  [string]$HeadcountDir = "E:\AGRICOLA\4-HC mensal",
  [string]$FilePattern = "Headcount Agricola_*.xls*",
  [string]$SheetName = "Ativos RH",
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

function Get-ReferenceMonth($fileName) {
  if ($fileName -match "(\d{2})\.(\d{4})") {
    return "$($matches[2])-$($matches[1])"
  }
  return (Get-Date).ToString("yyyy-MM")
}

function Normalize-Header($value, $index) {
  $text = [string]$value
  $text = $text.Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return "coluna_$index"
  }
  return $text
}

function Read-ExcelRows($filePath, $sheetName) {
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
    $values = $range.Value2
    $rowCount = $range.Rows.Count
    $colCount = $range.Columns.Count

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
      $hasValue = $false

      for ($col = 1; $col -le $colCount; $col++) {
        $cellValue = $values[$row, $col]
        if ($null -ne $cellValue -and "$cellValue".Trim().Length -gt 0) {
          $hasValue = $true
        }
        $item[$columns[$col - 1]] = $cellValue
      }

      if ($hasValue) {
        $rows += [pscustomobject]$item
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

$supabaseRestUrl = Get-ConfigValue "HEADCOUNT_SUPABASE_REST_URL" "https://wcifxyvesmhqurqhnway.supabase.co/rest/v1"
$supabaseKey = Get-ConfigValue "HEADCOUNT_SUPABASE_KEY"

if (-not $DryRun -and [string]::IsNullOrWhiteSpace($supabaseKey)) {
  throw "Configure a variavel de usuario HEADCOUNT_SUPABASE_KEY com a chave do Supabase antes de enviar."
}

if (-not (Test-Path -LiteralPath $HeadcountDir)) {
  throw "Pasta nao encontrada: $HeadcountDir"
}

$latestFile = Get-ChildItem -LiteralPath $HeadcountDir -File -Filter $FilePattern |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($null -eq $latestFile) {
  throw "Nenhum arquivo encontrado em $HeadcountDir com o padrao $FilePattern."
}

$referenceMonth = Get-ReferenceMonth $latestFile.Name
$importKey = "headcount_agricola_$referenceMonth"

Write-Step "Arquivo selecionado: $($latestFile.FullName)"
Write-Step "Mes de referencia: $referenceMonth"
Write-Step "Lendo aba: $SheetName"

$result = Read-ExcelRows $latestFile.FullName $SheetName

$payload = [ordered]@{
  import_key = $importKey
  fonte = "headcount_agricola"
  reference_month = $referenceMonth
  source_file = $latestFile.Name
  source_path = $latestFile.FullName
  source_sheet = $SheetName
  file_last_write_time = $latestFile.LastWriteTime.ToUniversalTime().ToString("o")
  total_rows = $result.Rows.Count
  columns_json = $result.Columns
  rows_json = $result.Rows
  imported_at = (Get-Date).ToUniversalTime().ToString("o")
  updated_at = (Get-Date).ToUniversalTime().ToString("o")
}

Write-Step "Linhas lidas: $($result.Rows.Count)"
Write-Step "Colunas lidas: $($result.Columns.Count)"

if ($DryRun) {
  Write-Step "Dry-run ativo. Nada foi enviado ao Supabase."
  $preview = $payload | ConvertTo-Json -Depth 8
  $previewPath = Join-Path $PSScriptRoot "headcount_snapshot_preview.json"
  $preview | Set-Content -LiteralPath $previewPath -Encoding UTF8
  Write-Step "Preview salvo em: $previewPath"
  exit 0
}

$uri = "$supabaseRestUrl/headcount_import_snapshots?on_conflict=import_key"
$headers = @{
  "apikey" = $supabaseKey
  "Authorization" = "Bearer $supabaseKey"
  "Content-Type" = "application/json"
  "Prefer" = "resolution=merge-duplicates,return=minimal"
}

Write-Step "Enviando snapshot para Supabase..."
$jsonBody = $payload | ConvertTo-Json -Depth 100 -Compress
$lastPayloadPath = Join-Path $PSScriptRoot "headcount_snapshot_last_payload.json"
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
Write-Step "Importacao concluida com sucesso."
