import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting, RouterAction } from 'expo-quick-actions/router';

function QuickActionsSetup() {
  useQuickActionRouting();

  useEffect(() => {
    QuickActions.setItems<RouterAction>([
      {
        id: 'reseta',
        title: 'View Reseta',
        icon: Platform.OS === 'ios' ? 'symbol:cross.case.fill' : undefined,
        params: { href: '/document-vault?type=reseta' },
      },
      {
        id: 'discount-id',
        title: 'View ID',
        icon: Platform.OS === 'ios' ? 'symbol:person.crop.rectangle.fill' : undefined,
        params: { href: '/discount-id' },
      },
      {
        id: 'compute',
        title: 'Do Diskwento',
        icon: Platform.OS === 'ios' ? 'symbol:percent' : undefined,
        params: { href: '/compute?type=pwd' },
      },
    ]);
  }, []);

  return null;
}

export default function TabLayout() {
  return (
    <>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        {/* explore is intentionally excluded from the tab bar */}
      </Tabs>
      <QuickActionsSetup />
    </>
  );
}
