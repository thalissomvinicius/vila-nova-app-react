import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { HelperText, TextInput as PaperTextInput } from 'react-native-paper';
import { Colors } from '../core/colors';
import { captureImageWithGps } from '../core/mediaCapture';

function normalizeValue(value) {
  if (value && typeof value === 'object') {
    return {
      texto: value.texto || '',
      fotos: Array.isArray(value.fotos) ? value.fotos : [],
    };
  }

  return {
    texto: value || '',
    fotos: [],
  };
}

export default function CampoObservacao({ field, value, onChange, error, visualMode }) {
  const { titulo, placeholder, obrigatorio } = field;
  const inputPlaceholder = placeholder || 'Digite suas observações aqui...';
  const [isCapturing, setIsCapturing] = useState(false);
  const current = normalizeValue(value);

  const updateText = (texto) => {
    onChange({ ...current, texto });
  };

  const addPhoto = async () => {
    setIsCapturing(true);

    try {
      const photo = await captureImageWithGps();
      if (!photo) return;

      onChange({
        ...current,
        fotos: [
          ...current.fotos,
          {
            ...photo,
            campo_id: field.id,
            source: 'observacao_camera',
          },
        ],
      });
    } catch (captureError) {
      if (captureError?.message === 'permissao_media') {
        Alert.alert('Permissão necessária', 'O aplicativo precisa de acesso à câmera.');
      } else {
        Alert.alert('Erro', 'Não foi possível anexar a foto.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const removePhoto = (photoIndex) => {
    onChange({
      ...current,
      fotos: current.fotos.filter((_, index) => index !== photoIndex),
    });
  };

  const photoActions = (
    <View style={styles.photoBlock}>
      <View style={styles.photoActions}>
        <TouchableOpacity
          style={[styles.photoButton, isCapturing ? styles.photoButtonDisabled : null]}
          onPress={addPhoto}
          disabled={isCapturing}
        >
          <Text style={styles.photoButtonText}>Câmera</Text>
        </TouchableOpacity>
        {isCapturing ? <ActivityIndicator size="small" color={Colors.greenInstitutional} /> : null}
      </View>

      {current.fotos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
          {current.fotos.map((photo, index) => (
            <View key={`${photo.uri || 'foto'}_${index}`} style={styles.photoItem}>
              {photo.uri ? <Image source={{ uri: photo.uri }} style={styles.photoThumb} /> : null}
              <TouchableOpacity style={styles.removePhotoButton} onPress={() => removePhoto(index)}>
                <Text style={styles.removePhotoText}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  if (visualMode === 'paper') {
    return (
      <View style={styles.paperContainer}>
        <PaperTextInput
          mode="outlined"
          label={`${titulo}${obrigatorio === 1 ? ' *' : ''}`}
          placeholder={inputPlaceholder}
          multiline
          numberOfLines={4}
          value={current.texto}
          onChangeText={updateText}
          error={!!error}
          outlineColor={Colors.cardBorder}
          activeOutlineColor={Colors.greenInstitutional}
          style={styles.paperInput}
        />
        {photoActions}
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={inputPlaceholder}
        placeholderTextColor={Colors.grayText}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={current.texto}
        onChangeText={updateText}
      />
      {photoActions}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  paperContainer: {
    marginBottom: 10,
  },
  paperInput: {
    minHeight: 110,
    backgroundColor: '#F8FCFA',
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
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.grayDark,
    height: 100,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  photoBlock: {
    marginTop: 10,
    gap: 10,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenInstitutional,
  },
  photoButtonDisabled: {
    opacity: 0.55,
  },
  photoButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  photoList: {
    gap: 10,
    paddingRight: 6,
  },
  photoItem: {
    width: 92,
    gap: 5,
  },
  photoThumb: {
    width: 92,
    height: 68,
    borderRadius: 8,
    backgroundColor: Colors.grayLight,
  },
  removePhotoButton: {
    minHeight: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  removePhotoText: {
    color: Colors.danger,
    fontSize: 10,
    fontWeight: '900',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
