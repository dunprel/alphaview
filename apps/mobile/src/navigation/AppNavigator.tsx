import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Platform, View }           from 'react-native';
import { BlurView }                 from 'expo-blur';
import { Ionicons }                 from '@expo/vector-icons';

// Screens
import HomeScreen         from '../screens/HomeScreen';
import BrowseScreen       from '../screens/BrowseScreen';
import LibraryScreen      from '../screens/LibraryScreen';
import DownloadsScreen    from '../screens/DownloadsScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import MovieDetailScreen  from '../screens/MovieDetailScreen';
import PlayerScreen       from '../screens/PlayerScreen';
import LoginScreen        from '../screens/LoginScreen';
import RegisterScreen     from '../screens/RegisterScreen';
import ProducerProfileScreen from '../screens/ProducerProfileScreen';
import SearchScreen       from '../screens/SearchScreen';

import { useAuthStore }   from '../store/auth.store';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', surface: '#1c1035' };

// ── Tab navigator ─────────────────────────────────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor:   BRAND.pink,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Outfit_500Medium', marginBottom: 2 },
        tabBarStyle: {
          backgroundColor:  Platform.OS === 'ios' ? 'transparent' : BRAND.bg,
          borderTopColor:   'rgba(124,58,237,0.2)',
          borderTopWidth:   0.5,
          paddingTop:       6,
          height:           Platform.OS === 'ios' ? 84 : 60,
        },
        tabBarBackground: Platform.OS === 'ios'
          ? () => <BlurView intensity={80} style={{ position: 'absolute', inset: 0 }} tint="dark" />
          : undefined,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Home:      ['home',            'home-outline'           ],
            Browse:    ['grid',            'grid-outline'           ],
            Library:   ['library',         'library-outline'        ],
            Downloads: ['download',        'download-outline'       ],
            Profile:   ['person-circle',   'person-circle-outline'  ],
          };
          const [active, inactive] = icons[route.name] ?? ['help', 'help-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}      />
      <Tab.Screen name="Browse"    component={BrowseScreen}    />
      <Tab.Screen name="Library"   component={LibraryScreen}   />
      <Tab.Screen name="Downloads" component={DownloadsScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen}   />
    </Tab.Navigator>
  );
}

// ── Auth navigator ────────────────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: BRAND.bg } }}>
      <Stack.Screen name="Login"    component={LoginScreen}    />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: BRAND.bg } }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main"            component={TabNavigator}          />
            <Stack.Screen name="MovieDetail"     component={MovieDetailScreen}
              options={{ presentation: 'modal', gestureEnabled: true }}             />
            <Stack.Screen name="Player"          component={PlayerScreen}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}  />
            <Stack.Screen name="ProducerProfile" component={ProducerProfileScreen} />
            <Stack.Screen name="Search"          component={SearchScreen}          />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
