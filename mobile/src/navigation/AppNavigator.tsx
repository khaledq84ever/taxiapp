import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

import PhoneScreen from '../screens/shared/PhoneScreen';
import OtpScreen from '../screens/shared/OtpScreen';
import PassengerHomeScreen from '../screens/passenger/HomeScreen';
import BookRideScreen from '../screens/passenger/BookRideScreen';
import FindingDriverScreen from '../screens/passenger/FindingDriverScreen';
import DriverHomeScreen from '../screens/driver/HomeScreen';
import DriverRegisterScreen from '../screens/driver/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user } = useSelector((s: RootState) => s.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#FFD700' }, headerTintColor: '#1a1a2e' }}>
        {!user ? (
          <>
            <Stack.Screen name="Phone" component={PhoneScreen} options={{ title: 'TaxiApp' }} />
            <Stack.Screen name="OTP" component={OtpScreen} options={{ title: 'Verify Phone' }} />
          </>
        ) : user.role === 'DRIVER' ? (
          <>
            <Stack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'Driver Dashboard', headerShown: false }} />
            <Stack.Screen name="DriverRegister" component={DriverRegisterScreen} options={{ title: 'Register as Driver' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="PassengerHome" component={PassengerHomeScreen} options={{ title: 'TaxiApp', headerShown: false }} />
            <Stack.Screen name="BookRide" component={BookRideScreen} options={{ title: 'Book a Ride' }} />
            <Stack.Screen name="FindingDriver" component={FindingDriverScreen} options={{ title: 'Finding Driver', headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
