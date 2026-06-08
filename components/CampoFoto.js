import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../core/colors';

export default function CampoFoto({ field, value, onChange, error }) {
  const { id, titulo, obrigatorio } = field;
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    const cameraRes = await ImagePicker.requestCameraPermissionsAsync();
    const libraryRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraRes.status === 'granted' && libraryRes.status === 'granted';
  };

  const handlePickImage = async (useCamera) => {
    setIsLoading(true);
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permissão necessária',
        'O aplicativo precisa de permissões de câmera e galeria para funcionar.'
      );
      setIsLoading(false);
      return;
    }

    try {
      let result;
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7, // Auto compress image
      };

      if (useCamera) {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        onChange(imageUri);
      }
    } catch (e) {
      console.error('Error picking image:', e);
      Alert.alert('Erro', 'Ocorreu um erro ao capturar a foto.');
    } finally {
      setIsLoading(false);
    }
  };

  const showSourceDialog = () => {
    Alert.alert(
      'Selecionar Foto',
      'Escolha a origem da foto de evidência:',
      [
        { text: 'Câmera', onPress: () => handlePickImage(true) },
        { text: 'Galeria', onPress: () => handlePickImage(false) },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.photoBox,
          error ? styles.photoBoxError : null,
          value ? styles.photoBoxActive : null,
        ]}
        onPress={value ? null : showSourceDialog}
        activeOpacity={0.8}
      >
        {value ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
            <TouchableOpacity style={styles.deleteBadge} onPress={() => onChange('')}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            {isLoading ? (
              <ActivityIndicator color={Colors.greenInstitutional} size="large" />
            ) : (
              <>
                <Text style={styles.placeholderIcon}>📷</Text>
                <Text style={styles.placeholderText}>Tirar Foto de Evidência</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

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
  photoBox: {
    height: 180,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBoxError: {
    borderColor: Colors.danger,
  },
  photoBoxActive: {
    borderWidth: 0,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  deleteBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
    color: Colors.grayText,
    opacity: 0.5,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.grayText,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
