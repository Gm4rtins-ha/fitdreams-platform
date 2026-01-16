// frontend/src/screens/main/UserProfileScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { updateProfile, uploadProfilePhoto } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

export default function UserProfileScreen({ navigation }) {
  const { updateUser } = useAuth(); // ✅ atualiza AuthContext em tempo real

  const [loading, setLoading] = useState(false);
  const [imageSource, setImageSource] = useState(null); // 'camera' | 'gallery'
  const [profileImage, setProfileImage] = useState(null);
  const [initialProfileImage, setInitialProfileImage] = useState(null); // ✅ detectar remoção
  const [tempImage, setTempImage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    height: '',
    weight: '',
    birthDate: '',
    gender: '',
  });

  useEffect(() => {
    loadUserData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await ImagePicker.requestCameraPermissionsAsync();
  };

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);

        let displayDate = user.birthDate || '';
        if (displayDate && displayDate.includes('-')) {
          const [year, month, day] = displayDate.split('-');
          displayDate = `${day}/${month}/${year}`;
        }

        setFormData({
          fullName: user.fullName || '',
          email: user.email || '',
          phone: user.phone || '',
          height: user.height?.toString() || '',
          weight: user.weight?.toString() || '',
          birthDate: displayDate,
          gender: user.gender || '',
        });

        if (user.profileImage) {
          setProfileImage(user.profileImage);
          setInitialProfileImage(user.profileImage); // ✅ guarda original
        } else {
          setProfileImage(null);
          setInitialProfileImage(null);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Atenção', 'Precisamos de permissão para usar a câmera');
        return;
      }
    
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
      });
    
      if (!result.canceled) {
        setTempImage(result.assets[0].uri);
        setImageSource('camera'); // ✅ AQUI (não é setTempSource)
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto');
    }
  };


  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],   // ✅ compatível (sem MediaType / sem MediaTypeOptions)
        allowsEditing: false,     // ✅ evita abrir a tela nativa "CORTAR"
        quality: 0.7,
      });

      if (!result.canceled) {
        setTempImage(result.assets[0].uri);
        setImageSource('gallery'); // ✅ marca origem
        setShowPreview(true);      // ✅ abre seu modal (confirmar / escolher outra)
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };


  const confirmPhoto = () => {
    setProfileImage(tempImage);
    setShowPreview(false);
    setTempImage(null);
  };

  const retakePhoto = () => {
    setShowPreview(false);
    setTempImage(null);
    setTimeout(() => takePhoto(), 100);
  };

  const chooseAnotherPhoto = () => {
    setShowPreview(false);
    setTempImage(null);

    setTimeout(() => {
      if (imageSource === 'camera') {
        takePhoto();
      } else {
        pickImage();
      }
    }, 150);
  };


  const removePhoto = () => {
    setProfileImage(null);
    setTempImage(null);
    setShowPreview(false);
  };

  const showImageOptions = () => {
    Alert.alert('Foto de Perfil', 'Escolha uma opção', [
      { text: 'Tirar Foto', onPress: takePhoto },
      { text: 'Escolher da Galeria', onPress: pickImage },
      ...(profileImage
        ? [{ text: 'Remover Foto', onPress: removePhoto, style: 'destructive' }]
        : []),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const formatBirthDate = (text) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const convertDateToISO = (dateStr) => {
    if (!dateStr || dateStr.length !== 10) return null;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const isLocalImage = (uri) => {
    if (!uri) return false;
    return uri.startsWith('file://') || uri.startsWith('content://');
  };

  const handleSave = async () => {
    try {
      if (!formData.fullName) {
        Alert.alert('Atenção', 'Nome é obrigatório');
        return;
      }

      setLoading(true);

      const birthDateISO = convertDateToISO(formData.birthDate);

      // ✅ atualiza campos do perfil
      const updateData = {
        fullName: formData.fullName,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        birthDate: birthDateISO,
        gender: formData.gender || null,
      };

      // ✅ se o usuário REMOVEU a foto que existia antes, manda null pro backend
      // (se ele removeu e depois colocou outra, isso será sobrescrito pelo upload)
      const removedPhoto = initialProfileImage && !profileImage;
      if (removedPhoto) {
        updateData.profileImage = null;
      }

      // 1) Atualiza dados do perfil (sem upload aqui)
      const result = await updateProfile(updateData);

      if (!result?.success) {
        Alert.alert('Erro', result?.message || 'Não foi possível atualizar');
        return;
      }

      // 2) Se tiver imagem local, faz upload e pega URL final
      let finalProfileImage = profileImage;

      if (isLocalImage(profileImage)) {
        const uploadResult = await uploadProfilePhoto(profileImage);

        if (!uploadResult?.success) {
          Alert.alert('Erro', uploadResult?.message || 'Falha ao enviar a foto');
          return;
        }

        // backend: { success:true, data:{ profileImage:"https://..." } }
        finalProfileImage = uploadResult.data?.profileImage || uploadResult.profileImage;

        if (!finalProfileImage) {
          Alert.alert('Erro', 'Foto enviada, mas não recebi a URL final.');
          return;
        }

        setProfileImage(finalProfileImage);
        setInitialProfileImage(finalProfileImage); // ✅ novo "original"
      }

      // 3) Persistir no AsyncStorage (sempre com URL final)
      const userDataRaw = await AsyncStorage.getItem('user');
      const user = userDataRaw ? JSON.parse(userDataRaw) : {};

      const updatedUser = {
        ...user,
        ...updateData,
        profileImage: finalProfileImage || null,
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // ✅ 4) Atualiza o AuthContext na hora (pra ProfileScreen refletir imediatamente)
      updateUser({
        ...updateData,
        profileImage: finalProfileImage || null,
      });

      Alert.alert('Sucesso', 'Perfil atualizado!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={showImageOptions} style={styles.avatarWrapper}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={48} color="#fff" />
                </View>
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Toque para alterar foto</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nome Completo *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome completo"
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-mail</Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Ionicons name="mail-outline" size={20} color="#CCC" style={styles.inputIcon} />
                <TextInput style={[styles.input, styles.inputDisabledText]} value={formData.email} editable={false} />
              </View>
              <Text style={styles.hint}>Não pode ser alterado</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  value={formData.birthDate}
                  onChangeText={(text) => setFormData({ ...formData, birthDate: formatBirthDate(text) })}
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!loading}
                />
              </View>
              <Text style={styles.hint}>Ex: 09/01/2007</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Altura (cm)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="resize-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 178"
                  value={formData.height}
                  onChangeText={(text) => setFormData({ ...formData, height: text.replace(/[^0-9.]/g, '') })}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Peso (kg)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="fitness-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 70"
                  value={formData.weight}
                  onChangeText={(text) => setFormData({ ...formData, weight: text.replace(/[^0-9.]/g, '') })}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gênero</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderButton, formData.gender === 'male' && styles.genderButtonActive]}
                  onPress={() => setFormData({ ...formData, gender: 'male' })}
                  disabled={loading}
                >
                  <Ionicons name="male" size={24} color={formData.gender === 'male' ? '#4A90E2' : '#999'} />
                  <Text style={[styles.genderButtonText, formData.gender === 'male' && styles.genderButtonTextActive]}>
                    Masculino
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.genderButton, formData.gender === 'female' && styles.genderButtonActive]}
                  onPress={() => setFormData({ ...formData, gender: 'female' })}
                  disabled={loading}
                >
                  <Ionicons name="female" size={24} color={formData.gender === 'female' ? '#E74C3C' : '#999'} />
                  <Text style={[styles.genderButtonText, formData.gender === 'female' && styles.genderButtonTextActive]}>
                    Feminino
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPreview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Preview da Foto</Text>

            {tempImage && <Image source={{ uri: tempImage }} style={styles.previewImage} />}

            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.retakeBtn} onPress={chooseAnotherPhoto}>
                <Ionicons
                  name={imageSource === 'camera' ? 'camera' : 'images'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.retakeBtnText}>
                  {imageSource === 'camera' ? 'Tirar Outra' : 'Escolher Outra'}
                </Text>
              </TouchableOpacity>


              <TouchableOpacity style={styles.useBtn} onPress={confirmPhoto}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.useBtnText}>Usar Esta</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowPreview(false);
                setTempImage(null);
              }}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  scrollView: { flex: 1 },
  avatarContainer: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', marginBottom: 16 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoText: { fontSize: 14, color: '#4A90E2', fontWeight: '600' },
  form: { paddingHorizontal: 16, paddingBottom: 32 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 16, height: 56 },
  inputDisabled: { backgroundColor: '#F8F9FA' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  inputDisabledText: { color: '#999' },
  hint: { fontSize: 12, color: '#999', marginTop: 4 },
  genderContainer: { flexDirection: 'row', gap: 12 },
  genderButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0' },
  genderButtonActive: { borderColor: '#4A90E2', backgroundColor: '#F0F7FF' },
  genderButtonText: { fontSize: 16, fontWeight: '500', color: '#666' },
  genderButtonTextActive: { color: '#4A90E2', fontWeight: '600' },
  saveButton: { backgroundColor: '#4A90E2', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { backgroundColor: '#CCC' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewCard: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  previewTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 20 },
  previewImage: { width: 250, height: 250, borderRadius: 125, marginBottom: 24 },
  previewButtons: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  retakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF6B6B', paddingVertical: 14, borderRadius: 12 },
  retakeBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  useBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#27AE60', paddingVertical: 14, borderRadius: 12 },
  useBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cancelText: { fontSize: 14, color: '#666', paddingVertical: 8 },
});
