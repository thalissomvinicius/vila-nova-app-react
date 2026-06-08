import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { Colors } from '../core/colors';

export default function CampoAssinatura({ field, value, onChange, error }) {
  const { id, titulo, obrigatorio } = field;
  const signatureRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(!!value);

  const handleOK = (signature) => {
    // signature is a base64 string starting with "data:image/png;base64,..."
    onChange(signature);
    setHasSignature(true);
  };

  const handleClear = () => {
    onChange('');
    setHasSignature(false);
  };

  const handleUndo = () => {
    if (signatureRef.current) {
      signatureRef.current.undo();
    }
  };

  // Custom CSS injection for webview drawing pad
  const style = `
    .m-signature-pad { box-shadow: none; border: none; background-color: #F5F7F9; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--footer { display: none; margin: 0px; }
    body,html { background-color: #F5F7F9; }
  `;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>

      <View style={[styles.canvasBox, error ? styles.canvasBoxError : null]}>
        {value ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: value }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.savedOverlay}>
              <Text style={styles.savedText}>Assinatura Gravada</Text>
            </View>
          </View>
        ) : (
          <View style={styles.canvasContainer}>
            <Text style={styles.manualHint}>Assine manualmente no quadro abaixo.</Text>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleOK}
              onClear={handleClear}
              webStyle={style}
              autoClear={false}
              descriptionText=""
            />
          </View>
        )}

        <View style={styles.controlBar}>
          {value ? (
            <TouchableOpacity style={styles.actionBtnClear} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Remover e Assinar Novamente</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={handleUndo}>
                <Text style={styles.actionBtnText}>Desfazer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => signatureRef.current?.clearSignature()}>
                <Text style={styles.actionBtnText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={() => signatureRef.current?.readSignature()}
              >
                <Text style={styles.saveBtnText}>Salvar Assinatura</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.grayDark,
  },
  required: {
    color: Colors.danger,
    fontWeight: 'bold',
  },
  canvasBox: {
    backgroundColor: '#F5F7F9',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    overflow: 'hidden',
  },
  canvasBoxError: {
    borderColor: Colors.danger,
  },
  canvasContainer: {
    height: 180,
    width: '100%',
  },
  manualHint: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 1,
    color: Colors.grayText,
    fontSize: 12,
    fontWeight: '600',
  },
  previewContainer: {
    height: 180,
    width: '100%',
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previewImage: {
    width: '90%',
    height: '90%',
  },
  savedOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: `${Colors.greenInstitutional}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.greenInstitutional,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnClear: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#EF444415',
  },
  clearBtnText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnText: {
    color: Colors.grayText,
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: Colors.greenInstitutional,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
