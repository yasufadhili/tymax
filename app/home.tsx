import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { BellIcon, CalendarDaysIcon, ChevronRightIcon, ClockIcon, Icon, PlayIcon, SearchIcon, SettingsIcon, StarIcon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withRepeat,
  withTiming,
  withDelay,
  FadeIn,
  SlideInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { useRouter } from "expo-router";
import { Skeleton } from "@/components/ui/skeleton";
import { getFirestore, collection, getDocs, query, where, limit } from '@react-native-firebase/firestore';
import { Channel, Category } from '@/types';

interface CategorySection {
  id: string;
  title: string;
  channels: Channel[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 60;
const CHANNEL_CARD_WIDTH = SCREEN_WIDTH * 0.7;
const SKELETON_ANIMATION_DURATION = 1200;
const SHIMMER_ANIMATION_DURATION = 1500;

export default function HomeScreen () {

  const router = useRouter();

  const scrollY = useSharedValue(0);
  const previousScrollY = useSharedValue(0);
  const headerOffsetY = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<CategorySection[]>([]);
  const [animationReady, setAnimationReady] = useState<boolean>(false);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const firestore = getFirestore();
        // Fetch categories
        const categoriesSnapshot = await getDocs(collection(firestore, 'categories'));
        const categories = categoriesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Category',
            ...data,
          };
        }) as Category[];
  
        const categorySections: CategorySection[] = [];
  
        for (const category of categories) {
          try {
            const channelsQuery = query(
              collection(firestore, 'channels'),
              where('category', '==', category.id),
              limit(5)
            );
  
            const channelsSnapshot = await getDocs(channelsQuery);
            const channels = channelsSnapshot.docs.map(doc => {
              const channelData = doc.data();
              return {
                id: doc.id,
                name: channelData.name || 'Unnamed Channel',
                logo: channelData.logo || 'https://via.placeholder.com/150x150?text=No+Logo',
                isLive: channelData.isLive || false,
                viewers: channelData.viewers || 0,
                currentShow: channelData.currentShow || 'No Show Information',
                category: channelData.category || '',
                ...channelData,
              };
            }) as Channel[];
  
            if (channels.length > 0) {
              categorySections.push({
                id: category.id,
                title: category.title,
                channels,
              });
            }
          } catch (channelError) {
            console.error(`Error fetching channels for category ${category.title}:`, channelError);
          }
        }
  
        setData(categorySections);
        setIsLoading(false);
  
        // Delay animation to ensure data is processed
        setTimeout(() => {
          setAnimationReady(true);
        }, 100);
      } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 50],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY: -headerOffsetY.value }],
      backgroundColor: `rgba(13, 17, 23, ${opacity})`,
      borderBottomWidth: opacity > 0.5 ? 1 : 0,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    };
  });   

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
  
      const diff = currentY - previousScrollY.value;
  
      // Scrolling down
      if (diff > 0) {
        headerOffsetY.value = Math.min(HEADER_HEIGHT, headerOffsetY.value + diff * 0.5);
      }
  
      // Scrolling up
      if (diff < 0) {
        headerOffsetY.value = Math.max(0, headerOffsetY.value + diff * 0.5);
      }
  
      previousScrollY.value = currentY;
      scrollY.value = currentY;
    },
  });

  const navigateToCategoryDetail = (categoryId: string, categoryTitle: string) => {
    router.push({
      pathname: '/category',
      params: {
        categoryId: categoryId,
        categoryTitle: categoryTitle,
      },
    });
  };

  const navigateToChannel = (channel: Channel) => {
    router.push({
      pathname: '/channel',
      params: {
        id: channel.id,
        channelName: channel.name,
        showName: channel.currentShow || '',
      },
    });
  };

  const renderHeader = () => {
    return (
      <Animated.View style={[headerAnimatedStyle, {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }]}>
      
        <SafeAreaView className="bg-background">
          <HStack className="h-16 px-4 justify-between items-center border-b">
            <Text className="text-3xl text-white" style={{fontFamily: "Bold"}}>Tymax</Text>
            <HStack space="md">
            </HStack>
          </HStack>
        </SafeAreaView>
      </Animated.View>
    );
  };

  const renderCategorySection = ({ item, index }: { item: CategorySection, index: number }) => {
    const IconComponent = PlayIcon;
    
    const enteringAnimation = FadeInDown.delay(200 + index * 100).springify();
    
    return (
      <Animated.View 
        entering={animationReady ? enteringAnimation : undefined}
        className="mb-6"
      >
        <HStack className="px-4 mb-2 justify-between items-center">
          <HStack space="sm" className="items-center">
            <Icon as={IconComponent} size="sm" color="white" />
            <Text className="text-xl text-white" style={{fontFamily: "Bold"}}>{item.title}</Text>
          </HStack>
          <TouchableOpacity onPress={() => navigateToCategoryDetail(item.id, item.title)}>
            <HStack space="xs" className="items-center">
              <Text className="text-sm text-blue-400" style={{fontFamily: "Light"}}>View All</Text>
              <Icon as={ChevronRightIcon} size="sm" className="text-blue-400" />
            </HStack>
          </TouchableOpacity>
        </HStack>
        
        <FlatList
          data={item.channels}
          keyExtractor={(channel) => channel.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item: channel, index: channelIndex }) => renderChannelCard(channel, channelIndex, index)}
        />
      </Animated.View>
    );
  };

  const renderChannelCard = (channel: Channel, channelIndex: number, sectionIndex: number) => {
    const enteringAnimation = FadeIn.delay(300 + sectionIndex * 100 + channelIndex * 50)
      .springify();

    return (
      <Pressable onPress={() => navigateToChannel(channel)}>
        <Animated.View 
          entering={animationReady ? enteringAnimation : undefined}
          className="mx-2 rounded-lg overflow-hidden bg-gray-800"
          style={{ width: CHANNEL_CARD_WIDTH, height: 180 }}
        >
          <Box className="relative h-full">
            <Image 
              source={{ uri: channel.logo || 'https://via.placeholder.com/150x150?text=No+Logo' }}
              className="w-full h-full"
              alt={channel.name || 'Unnamed Channel'}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }}
            />
            <Box className="absolute bottom-0 left-0 right-0 p-3">
              <HStack className="items-center space-x-2 mb-1">
                {channel.isLive && (
                  <HStack className="items-center space-x-1">
                    <Box className="w-2 h-2 rounded-full bg-red-500" />
                    <Text className="text-xs text-red-500" style={{fontFamily: "Medium"}}>LIVE</Text>
                  </HStack>
                )}
                {(channel.viewers ?? 0) > 0 && (
                  <Text className="text-xs text-gray-400" style={{fontFamily: "Light"}}>{(channel.viewers ?? 0).toLocaleString()} viewing</Text>
                )}
              </HStack>
              <Text className="text-lg text-white" style={{fontFamily: "SemiBold"}}>{channel.name || 'Unnamed Channel'}</Text>
              {channel.currentShow && channel.currentShow !== 'No Show Information' && (
                <Text className="text-sm text-gray-300" style={{fontFamily: "Regular"}}>Now: {channel.currentShow}</Text>
              )}
            </Box>
          </Box>
        </Animated.View>
      </Pressable>
    );
  };

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      opacity: contentOpacity.value,
    };
  });

  useEffect(() => {
    if (!isLoading) {
      contentOpacity.value = withTiming(1, { duration: 500 });
      contentTranslateY.value = withTiming(0, { duration: 500 });
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        { renderHeader() }
        <Animated.ScrollView
          contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3, 4].map((_, index) => (
            <Box key={`skeleton-category-${index}`} className="mb-6 px-4">
              <HStack className="mb-2 items-center">
                <Skeleton className="h-5 w-5 rounded-full mr-2"/>
                <Skeleton className="h-6 w-32 rounded-sm"/>
              </HStack>
              <HStack space="md">
                {[1, 2].map((_, channelIndex) => (
                  <Box
                    key={`skeleton-channel-${index}-${channelIndex}`}
                    className="rounded-lg overflow-hidden bg-gray-800"
                    style={{ width: CHANNEL_CARD_WIDTH, height: 180 }}
                  >
                    <Skeleton className="w-full h-full"/>
                  </Box>
                ))}
              </HStack>
            </Box>
          ))}
        </Animated.ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {renderHeader()}
      <Animated.View style={contentAnimatedStyle}>
        <Animated.FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderCategorySection}
          contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      </Animated.View>
    </SafeAreaView>
  );
}