import { useEffect, useRef, useState, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { 
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Image } from "@/components/ui/image";
import { Center } from "@/components/ui/center";
import { Divider } from "@/components/ui/divider";
import { Skeleton } from "@/components/ui/skeleton";
import { Heading } from "@/components/ui/heading";
import { Actionsheet, ActionsheetBackdrop, ActionsheetDragIndicatorWrapper } from "@/components/ui/actionsheet";
import { 
  ChevronLeftIcon, 
  Icon, 
  SearchIcon,
  GlobeIcon,
  ClockIcon,
  PlayIcon,
  SettingsIcon,
  FavouriteIcon,
  CheckIcon
} from "@/components/ui/icon";

import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInUp
} from 'react-native-reanimated';
import { ActionsheetContent, ActionsheetDragIndicator } from "@/components/ui/select/select-actionsheet";
import { router } from "expo-router";
import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import { Channel, RegionFilter } from '@/types';
import { Pressable } from "@/components/ui/pressable";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 60;
const ITEMS_PER_PAGE = 10;

interface RouteParams {
  categoryId: string;
  categoryTitle: string;
}

const CategoryDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { categoryId, categoryTitle } = route.params as RouteParams;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMoreData, setHasMoreData] = useState<boolean>(true);
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>(RegionFilter.ALL);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);
  const [animationReady, setAnimationReady] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);

  const scrollY = useSharedValue(0);
  const previousScrollY = useSharedValue(0);
  const headerOffsetY = useSharedValue(0);

  const categoryType = useMemo(() => {
    // Extract the type from categoryId (assuming format like '1', '2', etc.)
    const categoryNum = parseInt(categoryId);
    switch(categoryNum) {
      case 1: return 'popular';
      case 2: return 'favourites';
      case 3: return 'trending';
      case 4: return 'sports';
      case 5: return 'news';
      case 6: return 'movies';
      case 7: return 'kids';
      default: return 'popular';
    }
  }, [categoryId]);

  const filteredChannels = useMemo(() => {
    if (selectedRegion === RegionFilter.ALL) {
      return channels;
    }
    return channels.filter(channel => channel.region === selectedRegion);
  }, [channels, selectedRegion]);

  const fetchData = async (refresh = false) => {
    try {
      setIsLoading(true);
      const channelsRef = firestore().collection('channels').where('category', '==', categoryId);
      const snapshot = await channelsRef.limit(ITEMS_PER_PAGE).get();
      const fetchedChannels = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          logo: data.logo || 'https://via.placeholder.com/150x150?text=No+Logo',
          name: data.name || 'Unnamed Channel', 
          description: data.description || '', 
          rating: data.rating || null, 
          isLive: data.isLive || false, 
          viewers: data.viewers || 0, 
          currentShow: data.currentShow || 'No Show Information', 
          tags: data.tags || [], 
          ...data, 
        } as Channel;
      });

      if (refresh) {
        setChannels(fetchedChannels);
        setPage(1);
        setHasMoreData(true);
      } else {
        setChannels(fetchedChannels);
      }
    } catch (error) {
      console.error('Error fetching channels from Firestore:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);

      setTimeout(() => {
        setAnimationReady(true);
      }, 100);
    }
  };

  const fetchMoreData = async () => {
    if (!hasMoreData || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const channelsRef = firestore().collection('channels').where('category', '==', categoryId);
      const lastChannel = channels[channels.length - 1];
      const snapshot = await channelsRef
        .orderBy('id')
        .startAfter(lastChannel.id)
        .limit(ITEMS_PER_PAGE)
        .get();
      const newChannels = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          logo: data.logo || 'https://via.placeholder.com/150x150?text=No+Logo', 
          name: data.name || 'Unnamed Channel', 
          description: data.description || '', 
          rating: data.rating || null, 
          isLive: data.isLive || false, 
          viewers: data.viewers || 0, 
          currentShow: data.currentShow || 'No Show Information', 
          tags: data.tags || [], 
          ...data, 
        } as Channel;
      });

      if (newChannels.length > 0) {
        setChannels(prev => [...prev, ...newChannels]);
        setPage(prev => prev + 1);
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error('Error fetching more channels from Firestore:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    setHasMoreData(true);
    await fetchData(true);
  };

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - previousScrollY.value;
      
      // Scrolling down - hide header
      if (diff > 0) {
        headerOffsetY.value = Math.min(HEADER_HEIGHT, headerOffsetY.value + diff * 0.5);
      }
      
      // Scrolling up - show header
      if (diff < 0) {
        headerOffsetY.value = Math.max(0, headerOffsetY.value + diff * 0.5);
      }
      
      previousScrollY.value = currentY;
      scrollY.value = currentY;
    },
  });

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

  // Reset to top when filter changes
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [selectedRegion]);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    fetchData();
  }, [categoryType]);

  const navigateToChannel = (channel: Channel) => {
    router.push({
      pathname: '/channel',
      params: {
        id: channel.id,
        channelName: channel.name,
        showName: channel.currentShow || '',
      }
    });
  };

  const renderHeader = () => (
    <Animated.View style={[headerAnimatedStyle, {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    }]}>
      <SafeAreaView className="bg-background">
        <HStack className="h-16 px-4 justify-between items-center border-b border-gray-800">
          <HStack space="md" className="items-center">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon as={ChevronLeftIcon} size="md" color="white" />
            </TouchableOpacity>
            <Text className="text-xl text-white" style={{fontFamily: "SemiBold"}}>{categoryTitle}</Text>
          </HStack>
          <HStack space="md">
            {selectedRegion !== RegionFilter.ALL && (
              <TouchableOpacity onPress={() => setIsFilterSheetOpen(true)}>
                <HStack className="bg-gray-700 px-2 py-1 rounded-full items-center">
                  <Icon as={GlobeIcon} size="sm" color="white" className="mr-1" />
                  <Text className="text-white text-sm">{selectedRegion}</Text>
                </HStack>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setIsFilterSheetOpen(true)}>
              <Icon as={GlobeIcon} size="md" color="white" />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </SafeAreaView>
    </Animated.View>
  );

  const renderRegionFilter = () => null;

  const renderChannelItem = ({ item, index }: { item: Channel, index: number }) => {
    const enteringAnimation = animationReady ? 
      FadeIn.delay(100 + index % 10 * 50).springify() : undefined;

    return (
      <Animated.View
        entering={enteringAnimation}
        className="mx-1 my-1"
      >
        <Pressable 
          onPress={() => navigateToChannel(item)}
          className="bg-gray-950 rounded-lg overflow-hidden flex-row"
        >
          <Image 
            source={{ uri: item.logo || 'https://via.placeholder.com/150x150?text=No+Logo' }}
            className="w-20 h-20"
            alt={item.name}
          />
          <VStack className="flex-1 p-2 justify-between">
            <HStack className="justify-between items-start">
              <VStack space="xs" className="flex-1 mr-2">
                <Text className="text-white font-semibold" numberOfLines={1}>{item.name}</Text>
                <Text className="text-gray-500 text-xs" numberOfLines={2}>{item.description}</Text>
              </VStack>
              {item.rating && (
                <HStack className="bg-gray-800 px-2 py-1 rounded-full items-center">
                  <Icon as={FavouriteIcon} size="xs" color="yellow-400" className="mr-1" />
                  <Text className="text-white text-xs">{item.rating}</Text>
                </HStack>
              )}
            </HStack>
            
            <HStack className="items-center space-x-2">
              {item.isLive && (
                <HStack className="items-center space-x-1">
                  <Box className="w-2 h-2 rounded-full bg-red-500" />
                  <Text className="text-xs text-red-500">LIVE</Text>
                </HStack>
              )}
              {item.viewers && (
                <HStack className="items-center space-x-1">
                  <Icon as={ClockIcon} size="xs" className="text-gray-400" />
                  <Text className="text-xs text-gray-400">{item.viewers.toLocaleString()} viewing</Text>
                </HStack>
              )}
              {item.currentShow && (
                <HStack className="items-center space-x-1">
                  <Icon as={PlayIcon} size="xs" className="text-gray-400" />
                  <Text className="text-xs text-gray-400" numberOfLines={1}>
                    {item.currentShow}
                  </Text>
                </HStack>
              )}
            </HStack>
            
            {item.tags && item.tags.length > 0 && (
              <HStack className="flex-wrap mt-1">
                {item.tags.map((tag, idx) => (
                  <Box 
                    key={`${item.id}-tag-${idx}`}
                    className="bg-gray-800 px-2 py-0.5 rounded-sm mr-1 mb-1"
                  >
                    <Text className="text-xs text-gray-300">{tag}</Text>
                  </Box>
                ))}
              </HStack>
            )}
          </VStack>
        </Pressable>
      </Animated.View>
    );
  };

  const renderSkeletonItem = ({ index }: { index: number }) => (
    <HStack className="mx-4 my-2 bg-gray-950 rounded-lg overflow-hidden">
      <Skeleton className="w-24 h-24" />
      <VStack className="flex-1 p-3 justify-between">
        <Skeleton className="h-5 w-3/4 rounded-sm mb-2" />
        <Skeleton className="h-3 w-full rounded-sm mb-2" />
        <Skeleton className="h-3 w-1/2 rounded-sm" />
      </VStack>
    </HStack>
  );

  const renderEmptyState = () => (
    <Center className="py-16 bg-background">
      <Icon as={GlobeIcon} size="xl" className="text-gray-500 mb-4" />
      <Heading size="md" className="text-white mb-2">No Channels Found</Heading>
      <Text className="text-gray-400 text-center px-8 mb-4">
        There are no channels available for this region. Try selecting a different region filter.
      </Text>
      <TouchableOpacity 
        onPress={() => setSelectedRegion(RegionFilter.ALL)}
        className="bg-primary-600 px-4 py-2 rounded-lg"
      >
        <Text className="text-black font-medium">Show All Regions</Text>
      </TouchableOpacity>
    </Center>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <Center className="py-4">
        <ActivityIndicator size="small" color="#ffffff" />
      </Center>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {renderHeader()}
        <Animated.FlatList
          data={Array(10).fill(0)}
          renderItem={renderSkeletonItem}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {renderHeader()}
      
      <Animated.FlatList
        ref={flatListRef}
        data={filteredChannels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannelItem}
        contentContainerStyle={{ 
          paddingTop: HEADER_HEIGHT + 12, 
          paddingBottom: 20,
          paddingHorizontal: 8,
          flexGrow: filteredChannels.length === 0 ? 1 : undefined
        }}
        ListHeaderComponent={renderRegionFilter}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={fetchMoreData}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={["#ffffff"]}
          />
        }
      />
      
      {/* Region Filter Action Sheet */}
      <Actionsheet 
        isOpen={isFilterSheetOpen} 
        onClose={() => setIsFilterSheetOpen(false)}
        snapPoints={[40]}
      >
        <ActionsheetBackdrop />
        <ActionsheetContent className="bg-gray-900">
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <ScrollView className="w-full p-4" contentContainerStyle={{ paddingBottom: 20 }}>
            <HStack className="justify-between items-center mb-6">
              <Heading size="md" className="text-white">Filter by Region</Heading>
              <TouchableOpacity onPress={() => setIsFilterSheetOpen(false)}>
                <Text className="text-blue-400">Done</Text>
              </TouchableOpacity>
            </HStack>
            <VStack space="sm">
              {Object.values(RegionFilter).map((region) => (
                <TouchableOpacity 
                  key={region}
                  onPress={() => {
                    setSelectedRegion(region);
                    setIsFilterSheetOpen(false);
                  }}
                  className="py-3"
                >
                  <HStack className="justify-between items-center">
                    <Text className="text-white text-lg">{region}</Text>
                    {selectedRegion === region && (
                      <Icon as={CheckIcon} size="sm" color="blue-400" />
                    )}
                  </HStack>
                  <Divider className="bg-gray-700 mt-2" />
                </TouchableOpacity>
              ))}
            </VStack>
          </ScrollView>
        </ActionsheetContent>
      </Actionsheet>
    </SafeAreaView>
  );
};

export default CategoryDetailScreen;