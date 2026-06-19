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
import { Colors } from '../core/colors';
import { captureImageWithGps } from '../core/mediaCapture';

function normalizePhotoValue(value) {
  if (!value) return null;
  if (typeof value === 'string') return { uri: value };
  if (typeof value === 'object') return value;
  return null;
}

export default function CampoFoto({ field, value, onChange, error }) {
  const { titulo, obrigatorio } = field;
  const [isLoading, setIsLoading] = useState(false);
  const photo = normalizePhotoValue(value);

  const handleCapturePhoto = async () => {
    setIsLoading(true);

    try {
      const photo = await captureImageWithGps();
      if (photo) onChange(photo);
    } catch (e) {
      console.error('Error picking image:', e);
      if (e?.message === 'permissao_media') {
        Alert.alert('Permissao necessaria', 'O aplicativo precisa de acesso a camera.');
      } else {
        Alert.alert('Erro', 'Ocorreu um erro ao capturar a foto.');
      }
    } finally {
      setIsLoading(false);
    }
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
          photo ? styles.photoBoxActive : null,
        ]}
        onPress={photo ? null : handleCapturePhoto}
        activeOpacity={0.8}
      >
        {photo ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
            {photo.gps ? (
              <View style={styles.gpsBadge}>
                <Text style={styles.gpsBadgeText}>GPS</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.deleteBadge} onPress={() => onChange('')}>
              <Text style={styles.deleteText}>x</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            {isLoading ? (
              <ActivityIndicator color={Colors.greenInstitutional} size="large" />
            ) : (
              <>
                <Text style={styles.placeholderIcon}>CAM</Text>
                <Text style={styles.placeholderText}>Registrar imagem geolocalizada</Text>
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
  gpsBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 107, 74, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gpsBadgeText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: 11,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 18,
    color: Colors.grayText,
    opacity: 0.75,
    marginBottom: 8,
    fontWeight: '900',
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
