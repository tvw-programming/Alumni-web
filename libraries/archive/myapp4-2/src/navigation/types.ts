import type { NavigatorScreenParams } from '@react-navigation/native';

export type CatalogStackParamList = {
  Catalog: undefined;
  ProductDetail: { productId: string };
  Checkout: undefined;
};

export type RootTabParamList = {
  CatalogTab: NavigatorScreenParams<CatalogStackParamList>;
  OrdersTab: undefined;
  WalletTab: undefined;
  ShopTab: undefined;
  HealthTab: undefined;
  LearnTab: undefined;
  SocialTab: undefined;
  ServicesTab: undefined;
  TravelTab: undefined;
  TransportationTab: undefined;
  GamingTab: undefined;
  MediaTab: undefined;
  FitnessTab: undefined;
  RealEstateTab: undefined;
  EnterpriseTab: undefined;
  IoTTab: undefined;
  AgriTechTab: undefined;
  ProfileTab: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
