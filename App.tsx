import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BloodGlucoseMeasurement } from './src/domain/entities/GlucoseMeasurement';
import { MedicalParametersProfile } from './src/domain/entities/MedicalProfile';
import { LocalStorageGlucoseRepository } from './src/data/repositories/LocalStorageGlucoseRepository';
import { LocalStorageMedicalProfileRepository } from './src/data/repositories/LocalStorageMedicalProfileRepository';
import { RegisterScreen } from './src/presentation/screens/RegisterScreen';
import { HistoryScreen } from './src/presentation/screens/HistoryScreen';
import { StatsScreen } from './src/presentation/screens/StatsScreen';
import { SettingsScreen } from './src/presentation/screens/SettingsScreen';
import { THEME } from './src/presentation/theme';

type TabKey = 'register' | 'history' | 'stats' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('register');
  const [measurements, setMeasurements] = useState<BloodGlucoseMeasurement[]>([]);
  const [medicalProfile, setMedicalProfile] = useState<MedicalParametersProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const glucoseRepo = useMemo(() => new LocalStorageGlucoseRepository(), []);
  const medicalRepo = useMemo(() => new LocalStorageMedicalProfileRepository(), []);

  // Carregar dados iniciais locais
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedMeasurements, loadedProfile] = await Promise.all([
          glucoseRepo.getAll(),
          medicalRepo.getProfile(),
        ]);
        setMeasurements(loadedMeasurements);
        setMedicalProfile(loadedProfile);
      } catch (e) {
        console.error('Falha ao carregar dados:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [glucoseRepo, medicalRepo]);

  // Salvar nova medição
  const handleSaveMeasurement = async (
    data: Omit<BloodGlucoseMeasurement, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
  ) => {
    const newMeasurement: BloodGlucoseMeasurement = {
      ...data,
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    await glucoseRepo.save(newMeasurement);
    const updated = await glucoseRepo.getAll();
    setMeasurements(updated);
  };

  // Excluir medição (soft delete)
  const handleDeleteMeasurement = async (id: string) => {
    await glucoseRepo.delete(id);
    const updated = await glucoseRepo.getAll();
    setMeasurements(updated);
  };

  // Atualizar medição
  const handleUpdateMeasurement = async (item: BloodGlucoseMeasurement) => {
    await glucoseRepo.update(item);
    const updated = await glucoseRepo.getAll();
    setMeasurements(updated);
  };

  // Salvar / atualizar perfil médico
  const handleSaveMedicalProfile = async (profile: MedicalParametersProfile | null) => {
    if (profile) {
      await medicalRepo.saveProfile(profile);
      setMedicalProfile(profile);
    } else {
      await medicalRepo.clearProfile();
      setMedicalProfile(null);
    }
  };

  // Zerar banco de dados (LGPD)
  const handleHardReset = async () => {
    await glucoseRepo.hardDeleteAll();
    await medicalRepo.clearProfile();
    setMeasurements([]);
    setMedicalProfile(null);
  };

  // Obter a medição ativa mais recente
  const lastMeasurement = useMemo(() => {
    const active = measurements.filter((m) => !m.isDeleted);
    return active.length > 0 ? active[0] : null;
  }, [measurements]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Carregando diário de glicemia...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.mobileContainer}>
        {/* Cabeçalho do Aplicativo */}
        <View style={styles.appHeader}>
          <View style={styles.brandRow}>
            <View style={styles.logoIconBg}>
              <Ionicons name="water" size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.appTitle}>Glico+</Text>
              <Text style={styles.appSubtitle}>Acompanhamento Pessoal de Saúde</Text>
            </View>
          </View>

          {medicalProfile && medicalProfile.isActive && (
            <View style={styles.headerMedicalTag}>
              <Ionicons name="shield-checkmark" size={14} color="#065F46" />
              <Text style={styles.headerMedicalTagText}>Regra Médica Ativa</Text>
            </View>
          )}
        </View>

        {/* Conteúdo da Tela Ativa */}
        <View style={styles.screenContainer}>
          {activeTab === 'register' && (
            <RegisterScreen
              lastMeasurement={lastMeasurement}
              medicalProfile={medicalProfile}
              onSaveMeasurement={handleSaveMeasurement}
              onNavigateToHistory={() => setActiveTab('history')}
              onNavigateToSettings={() => setActiveTab('settings')}
            />
          )}
          {activeTab === 'history' && (
            <HistoryScreen
              measurements={measurements}
              onDeleteMeasurement={handleDeleteMeasurement}
              onUpdateMeasurement={handleUpdateMeasurement}
              onNavigateToRegister={() => setActiveTab('register')}
            />
          )}
          {activeTab === 'stats' && <StatsScreen measurements={measurements} />}
          {activeTab === 'settings' && (
            <SettingsScreen
              medicalProfile={medicalProfile}
              measurements={measurements}
              onSaveMedicalProfile={handleSaveMedicalProfile}
              onHardResetData={handleHardReset}
            />
          )}
        </View>

        {/* Barra de Navegação Inferior de Alta Acessibilidade */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('register')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'register' ? 'add-circle' : 'add-circle-outline'}
              size={26}
              color={activeTab === 'register' ? THEME.colors.primary : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'register' ? styles.navTabTextActive : styles.navTabTextInactive,
              ]}
            >
              Registrar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'history' ? 'time' : 'time-outline'}
              size={26}
              color={activeTab === 'history' ? THEME.colors.primary : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'history' ? styles.navTabTextActive : styles.navTabTextInactive,
              ]}
            >
              Histórico
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('stats')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'stats' ? 'stats-chart' : 'stats-chart-outline'}
              size={26}
              color={activeTab === 'stats' ? THEME.colors.primary : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'stats' ? styles.navTabTextActive : styles.navTabTextInactive,
              ]}
            >
              Estatísticas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
              size={26}
              color={activeTab === 'settings' ? THEME.colors.primary : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'settings' ? styles.navTabTextActive : styles.navTabTextInactive,
              ]}
            >
              Ajustes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F8FAFC' : '#FFFFFF',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#E2E8F0',
        }
      : {}),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginTop: 12,
    fontWeight: '600',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  appSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  headerMedicalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerMedicalTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 4,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 68,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navTabText: {
    fontSize: 12,
    marginTop: 2,
  },
  navTabTextActive: {
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  navTabTextInactive: {
    fontWeight: '500',
    color: THEME.colors.textMuted,
  },
});
