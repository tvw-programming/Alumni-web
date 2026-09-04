import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Badge, Icon } from 'react-native-paper';
import { View } from 'react-native';

import { CatalogScreen } from '@/features/catalog/screens/CatalogScreen';
import { ProductDetailScreen } from '@/features/catalog/screens/ProductDetailScreen';
import { CheckoutScreen } from '@/features/checkout/screens/CheckoutScreen';
import { OrdersScreen } from '@/features/orders/screens/OrdersScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { HealthScreen } from '@/features/health/screens/HealthScreen';
import { LearnScreen } from '@/features/learn/screens/LearnScreen';
import { SocialScreen } from '@/features/social/screens/SocialScreen';
import { ServicesScreen } from '@/features/ondemand/screens/ServicesScreen';
import { TravelScreen } from '@/features/travel/screens/TravelScreen';
import { TransportationScreen } from '@/features/transportation/screens/TransportationScreen';
import { GamingScreen } from '@/features/gaming/screens/GamingScreen';
import { MediaScreen } from '@/features/media/screens/MediaScreen';
import { FitnessScreen } from '@/features/fitness/screens/FitnessScreen';
import { RealEstateScreen } from '@/features/realestate/screens/RealEstateScreen';
import { EnterpriseScreen } from '@/features/enterprise/screens/EnterpriseScreen';
import { IoTScreen } from '@/features/iot/screens/IoTScreen';
import { AgriTechScreen } from '@/features/agritech/screens/AgriTechScreen';
import { ShopScreen } from '@/features/shop/screens/ShopScreen';
import { WalletScreen } from '@/features/wallet/screens/WalletScreen';
import { selectCartCount, useCartStore } from '@/store';
import { useAppTheme, useThemeControl } from '@/theme';

import type { CatalogStackParamList, RootTabParamList } from './types';

const Stack = createNativeStackNavigator<CatalogStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const CatalogStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Store' }} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Details' }} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
  </Stack.Navigator>
);

const CartIcon = ({ color, size }: { color: string; size: number }) => {
  const count = useCartStore(selectCartCount);
  return (
    <View>
      <Icon source="storefront-outline" size={size} color={color} />
      {count > 0 && <Badge size={16} style={{ position: 'absolute', top: -4, right: -8 }}>{count}</Badge>}
    </View>
  );
};

export const RootNavigator = () => {
  const theme = useAppTheme();
  const { scheme } = useThemeControl();

  // Bridge our Paper theme into React Navigation so the two never disagree.
  const navigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        }}
      >
        <Tab.Screen
          name="CatalogTab"
          component={CatalogStack}
          options={{ title: 'Store', tabBarIcon: CartIcon }}
        />
        <Tab.Screen
          name="OrdersTab"
          component={OrdersScreen}
          options={{
            title: 'Orders',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="receipt" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="WalletTab"
          component={WalletScreen}
          options={{
            title: 'Wallet',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="wallet-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="ShopTab"
          component={ShopScreen}
          options={{
            title: 'Shop UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="shopping-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="HealthTab"
          component={HealthScreen}
          options={{
            title: 'Health UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="heart-pulse" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="LearnTab"
          component={LearnScreen}
          options={{
            title: 'Learn UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="school-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="SocialTab"
          component={SocialScreen}
          options={{
            title: 'Social UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="forum-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="ServicesTab"
          component={ServicesScreen}
          options={{
            title: 'Services UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="truck-delivery-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="TravelTab"
          component={TravelScreen}
          options={{
            title: 'Travel UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="bag-suitcase-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="TransportationTab"
          component={TransportationScreen}
          options={{
            title: 'Rides UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="car-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="GamingTab"
          component={GamingScreen}
          options={{
            title: 'Gaming UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="controller-classic-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="MediaTab"
          component={MediaScreen}
          options={{
            title: 'Media UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="movie-open-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="FitnessTab"
          component={FitnessScreen}
          options={{
            title: 'Fitness UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="heart-pulse" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="RealEstateTab"
          component={RealEstateScreen}
          options={{
            title: 'Property UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="home-city-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="EnterpriseTab"
          component={EnterpriseScreen}
          options={{
            title: 'Workspace UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="briefcase-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="IoTTab"
          component={IoTScreen}
          options={{
            title: 'Smart Home UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="home-automation" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="AgriTechTab"
          component={AgriTechScreen}
          options={{
            title: 'AgriTech UI',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="tractor-variant" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            headerShown: true,
            tabBarIcon: ({ color, size }) => <Icon source="account-circle-outline" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
