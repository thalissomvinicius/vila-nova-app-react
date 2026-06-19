import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Colors } from '../core/colors';

const navItems = [
  { key: 'home', label: 'Início', icon: 'home-outline', route: '/home' },
  { key: 'forms', label: 'Formulários', icon: 'format-list-bulleted', route: '/formularios/campo' },
  { key: 'history', label: 'Histórico', icon: 'history', route: '/historico' },
  { key: 'sync', label: 'Sinc.', icon: 'sync', route: '/sync' },
];

export function TopBar({ title = 'Operação de Campo', showBack = false, onProfile, compact = false }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openProfile = onProfile || (() => router.push('/profile'));

  return (
    <View
      style={[
        styles.topbar,
        compact ? styles.topbarCompact : null,
        { paddingTop: Math.max(insets.top + (compact ? 4 : 8), compact ? 12 : 22) },
      ]}
    >
      <TouchableOpacity
        style={[styles.squareButton, !showBack ? styles.hiddenButton : null]}
        onPress={() => router.back()}
        disabled={!showBack}
      >
        <MaterialCommunityIcons name="chevron-left" size={25} color={Colors.greenInstitutional} />
      </TouchableOpacity>

      <View style={styles.topbarTitle}>
        {!compact ? <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" /> : null}
        {!compact ? <Text style={styles.kicker}>Tomé-Açu</Text> : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <TouchableOpacity style={styles.squareButton} onPress={openProfile}>
        <MaterialCommunityIcons name="account-outline" size={23} color={Colors.greenInstitutional} />
        <View style={styles.syncDot} />
      </TouchableOpacity>
    </View>
  );
}

export function BottomNav({ active = 'home' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom + 10, 12) }]}>
      {navItems.map((item) => {
        const isActive = active === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, isActive ? styles.navItemActive : null]}
            onPress={() => router.replace(item.route)}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={20}
              color={isActive ? Colors.orangeDark : '#778079'}
            />
            <Text style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function ScreenShell({ title, activeNav, showBack = false, children, onProfile }) {
  return (
    <View style={styles.shell}>
      <TopBar title={title} showBack={showBack} onProfile={onProfile} />
      <View style={styles.content}>{children}</View>
      <BottomNav active={activeNav} />
    </View>
  );
}

export function Chip({ children, dark = false }) {
  return (
    <View style={[styles.chip, dark ? styles.chipDark : styles.chipOffline]}>
      <Text style={[styles.chipText, dark ? styles.chipDarkText : styles.chipOfflineText]}>
        {children}
      </Text>
    </View>
  );
}

export function IconBox({ name, muted = false, amber = false }) {
  return (
    <View style={[styles.iconBox, muted ? styles.iconMuted : null, amber ? styles.iconAmber : null]}>
      <MaterialCommunityIcons
        name={name}
        size={22}
        color={amber ? Colors.orangeDark : muted ? '#66706A' : Colors.greenDark}
      />
    </View>
  );
}

export const chromeStyles = {
  radius: 8,
  screenPadding: 16,
  bottomPadding: 92,
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    alignSelf: 'center',
    backgroundColor: '#F7FAF6',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#DFE6DF',
  },
  content: {
    flex: 1,
  },
  topbar: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(247,250,246,0.98)',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE6DF',
    shadowColor: '#203125',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  topbarCompact: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  squareButton: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    backgroundColor: Colors.white,
    marginTop: 3,
    shadowColor: '#203125',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  hiddenButton: {
    opacity: 0,
  },
  topbarTitle: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  logo: {
    width: 124,
    height: 38,
    marginBottom: 3,
  },
  kicker: {
    color: Colors.greenInstitutional,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.grayDark,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 19,
  },
  syncDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.orangeInstitutional,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#203125',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: Colors.orangeLight,
  },
  navLabel: {
    color: '#778079',
    fontSize: 11,
    fontWeight: '900',
  },
  navLabelActive: {
    color: Colors.orangeDark,
  },
  chip: {
    minHeight: 26,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '900',
  },
  chipOffline: {
    backgroundColor: Colors.orangeLight,
  },
  chipOfflineText: {
    color: '#7B4A08',
  },
  chipDark: {
    backgroundColor: 'rgba(18,83,52,0.86)',
  },
  chipDarkText: {
    color: '#DDF6E7',
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.greenLight,
  },
  iconMuted: {
    backgroundColor: '#EDF1ED',
  },
  iconAmber: {
    backgroundColor: Colors.orangeLight,
  },
});
