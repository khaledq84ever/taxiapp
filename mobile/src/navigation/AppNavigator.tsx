import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

import PhoneScreen from '../screens/shared/PhoneScreen';
import OtpScreen from '../screens/shared/OtpScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

import PassengerHomeScreen from '../screens/passenger/HomeScreen';
import BookRideScreen from '../screens/passenger/BookRideScreen';
import FindingDriverScreen from '../screens/passenger/FindingDriverScreen';
import TrackDriverScreen from '../screens/passenger/TrackDriverScreen';
import TripHistoryScreen from '../screens/passenger/TripHistoryScreen';
import RateTripScreen from '../screens/passenger/RateTripScreen';

import DriverHomeScreen from '../screens/driver/HomeScreen';
import DriverRegisterScreen from '../screens/driver/RegisterScreen';
import ActiveTripScreen from '../screens/driver/ActiveTripScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';

const Stack = createNativeStackNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: '#FFD700' },
  headerTintColor: '#1a1a2e',
  headerTitleStyle: { fontWeight: '700' as const },
};

export default function AppNavigator() {
  const { user } = useSelector((s: RootState) => s.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={headerStyle}>
        {!user ? (
          <>
            <Stack.Screen name="Phone" component={PhoneScreen} options={{ title: 'TaxiApp' }} />
            <Stack.Screen name="OTP" component={OtpScreen} options={{ title: 'Verify Phone' }} />
          </>
        ) : user.role === 'DRIVER' ? (
          <>
            <Stack.Screen
              name="DriverHome"
              component={DriverHomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DriverRegister"
              component={DriverRegisterScreen}
              options={{ title: 'Register as Driver' }}
            />
            <Stack.Screen
              name="ActiveTrip"
              component={ActiveTripScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DriverEarnings"
              component={EarningsScreen}
              options={{ title: 'My Earnings' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="PassengerHome"
              component={PassengerHomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BookRide"
              component={BookRideScreen}
              options={{ title: 'Book a Ride' }}
            />
            <Stack.Screen
              name="FindingDriver"
              component={FindingDriverScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TrackDriver"
              component={TrackDriverScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TripHistory"
              component={TripHistoryScreen}
              options={{ title: 'Trip History' }}
            />
            <Stack.Screen
              name="RateTrip"
              component={RateTripScreen}
              options={{ title: 'Rate Your Trip' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
