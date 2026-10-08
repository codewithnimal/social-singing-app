// Vibely — Main Tab Layout
// Light theme bottom navigation: Sing (dominant) | Friends | Chats | Profile

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize } from '../../src/theme/typography';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface TabItem {
  name: string;
  icon: string;
  activeIcon: string;
  label: string;
  isSing?: boolean;
}

const TAB_ITEMS: TabItem[] = [
  { name: 'home', icon: '🎵', activeIcon: '🎵', label: 'Sing', isSing: true },
  { name: 'friends', icon: '👥', activeIcon: '👥', label: 'Friends' },
  { name: 'chats', icon: '💬', activeIcon: '💬', label: 'Chats' },
  { name: 'profile', icon: '◎', activeIcon: '◎', label: 'Profile' },
];

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: Colors.background.primary },
        animation: 'none',
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home/index" options={{ title: 'Sing' }} />
      <Tabs.Screen name="friends/index" options={{ title: 'Friends' }} />
      <Tabs.Screen name="friends/add" options={{ href: null }} />
      <Tabs.Screen name="chats/index" options={{ title: 'Chats' }} />
      <Tabs.Screen name="chats/[chatId]" options={{ href: null }} />
      <Tabs.Screen name="profile/index" options={{ title: 'Profile' }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="profile/wallpaper" options={{ href: null }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null }} />
    </Tabs>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const currentRouteName = state.routes[state.index]?.name;

  // Sub-screens where the bottom tab bar must NOT be displayed
  const HIDE_TAB_BAR_ROUTES = [
    'chats/[chatId]',
    'friends/add',
    'profile/edit',
    'profile/settings',
    'profile/wallpaper',
    'profile/notifications',
  ];

  if (HIDE_TAB_BAR_ROUTES.includes(currentRouteName)) {
    return null;
  }

  const getTabIndex = (routeName: string): number => {
    const map: Record<string, number> = {
      'home/index': 0,
      'friends/index': 1,
      'chats/index': 2,
      'profile/index': 3,
    };
    return map[routeName] ?? -1;
  };

  const activeTabIndex = getTabIndex(currentRouteName ?? '');

  return (
    <View style={[tabStyles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* White surface with subtle shadow */}
      <View style={tabStyles.tabBar}>
        {TAB_ITEMS.map((tab, index) => {
          const isActive = activeTabIndex === index;
          const targetRoute = state.routes.find((r: any) =>
            r.name === `${tab.name}/index`
          );

          if (tab.isSing) {
            // Central "Sing" button — visually dominant
            return (
              <TouchableOpacity
                key={tab.name}
                style={tabStyles.singTab}
                onPress={() => {
                  if (targetRoute) {
                    navigation.navigate(targetRoute.name);
                  }
                }}
                accessibilityLabel="Sing"
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <LinearGradient
                  colors={[Colors.brand.blue, Colors.brand.purple] as [string, string]}
                  style={[
                    tabStyles.singButton,
                    isActive && tabStyles.singButtonActive,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={tabStyles.singIcon}>🎙️</Text>
                </LinearGradient>
                <Text style={[tabStyles.tabLabel, isActive && tabStyles.activeLabel]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              style={tabStyles.tab}
              onPress={() => {
                if (targetRoute) {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: targetRoute.key,
                    canPreventDefault: true,
                  });
                  if (!event.defaultPrevented) {
                    navigation.navigate(targetRoute.name);
                  }
                }
              }}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[tabStyles.iconWrap, isActive && tabStyles.iconWrapActive]}>
                <Text style={[tabStyles.tabIcon, isActive && tabStyles.activeIcon]}>
                  {tab.icon}
                </Text>
              </View>
              <Text style={[tabStyles.tabLabel, isActive && tabStyles.activeLabel]}>
                {tab.label}
              </Text>
              {isActive && <View style={tabStyles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
    paddingTop: 4,
  },
  singTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 2,
  },
  singButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 6,
  },
  singButtonActive: {
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  singIcon: {
    fontSize: 22,
  },
  iconWrap: {
    width: 36,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.brand.blue + '12',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  activeIcon: {
    opacity: 1,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  activeLabel: {
    color: Colors.brand.blue,
    fontFamily: FontFamily.semiBold,
  },
  activeDot: {
    position: 'absolute',
    top: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.brand.blue,
  },
});
