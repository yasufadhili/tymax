import { useEffect, useState, useCallback } from "react";
import { useRoute } from "@react-navigation/native";
import { 
  Platform, 
  StatusBar, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Skeleton } from "@/components/ui/skeleton";

import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';

import { 
  CalendarDaysIcon, 
  ClockIcon, 
  FavouriteIcon, 
  StarIcon,
  Icon 
} from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs } from '@react-native-firebase/firestore';
import { Channel, RelatedShow } from '@/types';
import { router } from "expo-router";

interface PlayScreenRouteParams {
  id: string;
  channelName: string;
  showName?: string;
}

const LiveIndicator = () => (
  <HStack space="xs" className="items-center">
    <Box className="w-2 h-2 rounded-full bg-red-500" />
    <Text size="sm" className="text-red-500 font-medium">LIVE</Text>
  </HStack>
);

const VideoPlayerSection = ({ player }: { player: any }) => (
  <Box className="w-full bg-black shadow-md">
    <VideoView 
      style={{
        width: "100%",
        height: 260
      }} 
      player={player} 
      allowsFullscreen 
      allowsPictureInPicture 
    />
  </Box>
);

interface ChannelDetailsSectionProps {
  channelData: Channel | { name: string; currentShow?: string; viewers: number };
  isLive: boolean;
}

const ChannelDetailsSection = ({ channelData, isLive }: ChannelDetailsSectionProps) => (
  <Box className="px-5 py-4 bg-background shadow-sm">
    <HStack space="md" className="items-center justify-between">
      <VStack space="xs" className="flex-1">
        <Heading size="xl" className="text-2xl font-bold text-white">
          {channelData.name}
        </Heading>
        <HStack space="sm" className="items-center flex-wrap">
          <HStack space="xs" className="items-center mr-3">
            <Icon as={ClockIcon} size="sm" className="text-gray-400" />
            <Text size="sm" className="text-gray-400">
              {channelData.viewers ? `${channelData.viewers.toLocaleString()} watching` : 'Viewership data unavailable'}
            </Text>
          </HStack>
          {isLive && <LiveIndicator />}
        </HStack>
      </VStack>
      <Button
        variant="solid"
        size="sm"
        className="rounded-full h-10 w-10 flex items-center justify-center bg-transparent"
        onPress={() => {}}
      >
        <Icon as={FavouriteIcon} size="xl" className="text-primary-500" />
      </Button>
    </HStack>
  </Box>
);

const ChannelDetailsSkeleton = () => (
  <Box className="px-4 py-3">
    <HStack space="md" className="items-center justify-between">
      <VStack space="xs" className="flex-1">
        <Skeleton className="h-8 w-3/4 rounded-md" />
        <HStack space="sm" className="items-center">
          <Skeleton className="h-4 w-32 rounded-md" />
        </HStack>
      </VStack>
      <Skeleton className="h-10 w-10 rounded-full" />
    </HStack>
  </Box>
);

interface RelatedShowItemProps {
  item: {
    id: string;
    thumbnail: string;
    isLive: boolean;
    title: string;
    channelName: string;
    duration?: string;
    views?: number;
  };
  onPress: () => void;
}

const RelatedShowItem = ({ item, onPress }: RelatedShowItemProps) => (
  <TouchableOpacity 
    key={item.id} 
    className="w-72 mr-4"
    onPress={onPress}
  >
    <Box className="rounded-xl overflow-hidden bg-gray-800 shadow-md" style={{ width: '100%', height: 200 }}>
      <Box className="relative h-full">
        <Image
          source={{ uri: item.thumbnail }}
          className="w-full h-3/5"
          resizeMode="cover"
          alt={item.title}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }}
        />
        <Box className="absolute bottom-0 left-0 right-0 p-4">
          <HStack className="items-center space-x-2 mb-1">
            {item.isLive && (
              <HStack className="items-center space-x-1">
                <Box className="w-2 h-2 rounded-full bg-red-500" />
                <Text size="xs" className="text-red-500 font-medium">LIVE</Text>
              </HStack>
            )}
            {item.views && (
              <Text size="xs" className="text-gray-400 font-light">{item.views.toLocaleString()} views</Text>
            )}
          </HStack>
          <Text size="md" className="text-white font-semibold" numberOfLines={1}>{item.title}</Text>
          <Text size="sm" className="text-gray-300 font-regular">{item.channelName}</Text>
        </Box>
      </Box>
    </Box>
  </TouchableOpacity>
);

const RelatedShowsSkeleton = () => (
  <HStack className="px-4">
    {[1, 2].map((item) => (
      <Box key={item} className="w-64 mr-4">
        <Skeleton className="w-full h-36 rounded-lg mb-2" />
        <Skeleton className="w-3/4 h-4 rounded-md mb-2" />
        <Skeleton className="w-1/2 h-3 rounded-md mb-2" />
        <Skeleton className="w-1/3 h-3 rounded-md" />
      </Box>
    ))}
  </HStack>
);

interface RelatedShowsSectionProps {
  relatedShows: Array<{
    id: string;
    thumbnail: string;
    title: string;
    channelName: string;
    duration?: string;
    isLive: boolean;
    views?: number;
  }>;
  isLoading: boolean;
}

const RelatedShowsSection = ({ relatedShows, isLoading }: RelatedShowsSectionProps) => (
  <VStack space="md" className="px-5 py-4">
    <Heading size="lg" className="text-white">Related Shows</Heading>
    {isLoading ? (
      <RelatedShowsSkeleton />
    ) : (
      <FlatList
        data={relatedShows}
        renderItem={({ item }) => (
          <RelatedShowItem item={item} onPress={() => {
            router.push({
              pathname: '/channel',
              params: {
                id: item.id,
                channelName: item.channelName,
                showName: item.title || '',
              }
            });
          }} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        snapToInterval={288} // Width + margin
        decelerationRate="fast"
        snapToAlignment="start"
      />
    )}
  </VStack>
);

interface ScheduleItemProps {
  time: string;
  title: string;
  isActive: boolean;
}

const ScheduleItem = ({ time, title, isActive }: ScheduleItemProps) => (
  <HStack space="md" className="items-center py-2 border-l-2 border-gray-700 pl-3">
    <Icon 
      as={CalendarDaysIcon} 
      size="sm" 
      className={isActive ? "text-primary-500" : "text-gray-400"} 
    />
    <Text 
      size="sm" 
      className={isActive ? "font-medium text-primary-500" : "font-medium text-gray-300"}
    >
      {time}
    </Text>
    <Text 
      size="sm" 
      className={isActive ? "text-primary-400 font-semibold" : "text-gray-400"}
    >
      {title}
    </Text>
  </HStack>
);

const AboutChannelSkeleton = () => (
  <VStack space="md" className="px-4 py-3">
    <Skeleton className="h-6 w-48 rounded-md mb-2" />
    <Skeleton className="h-20 w-full rounded-md mb-4" />
    <Skeleton className="h-6 w-40 rounded-md mb-2" />
    {[1, 2, 3].map((item) => (
      <Skeleton key={item} className="h-5 w-full rounded-md mb-2" />
    ))}
  </VStack>
);

interface AboutChannelSectionProps {
  channelData: Channel;
  isLoading: boolean;
}

const AboutChannelSection = ({ channelData, isLoading }: AboutChannelSectionProps) => (
  <VStack space="md" className="px-5 py-4">
    <Heading size="lg" className="text-white">About Channel</Heading>
    {isLoading ? (
      <AboutChannelSkeleton />
    ) : (
      <VStack space="md">
        <Text size="sm" className="text-gray-300 leading-6">
          {channelData.description}
        </Text>
        <VStack space="sm">
          <Heading size="md" className="text-white">Today's Schedule</Heading>
          {'schedule' in channelData && channelData.schedule && channelData.schedule.length > 0 ? (
            channelData.schedule.map((item, index) => (
              <ScheduleItem 
                key={index} 
                time={item.time} 
                title={item.title} 
                isActive={item.title === channelData.currentShow}
              />
            ))
          ) : (
            <Text size="sm" className="text-gray-400">No schedule available</Text>
          )}
        </VStack>
      </VStack>
    )}
  </VStack>
);

export default function ChannelDetails() {
  const route = useRoute();
  const params = route.params as PlayScreenRouteParams;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [channelData, setChannelData] = useState<Channel | null>(null);
  const [relatedShows, setRelatedShows] = useState<RelatedShow[]>([]);

  const videoSource = channelData?.streamUrl || '';
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  const fetchData = useCallback(async () => {
    try {
      const firestore = getFirestore();
      const channelRef = doc(firestore, 'channels', params.id);
      const channelDoc = await getDoc(channelRef);

      if (channelDoc.exists()) {
        const channel = {
          id: channelDoc.id,
          ...channelDoc.data(),
        } as Channel;
        setChannelData(channel);
        setIsLive(channel.isLive);

        // Fetch related shows (e.g., from the same category)
        const relatedQuery = query(
          collection(firestore, 'channels'),
          where('category', '==', channel.category),
          limit(5)
        );
        const relatedSnapshot = await getDocs(relatedQuery);
        const related = relatedSnapshot.docs
          .filter(doc => doc.id !== params.id)
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.currentShow || data.name || 'Unnamed Show',
              thumbnail: data.logo || 'https://via.placeholder.com/150x150?text=No+Logo',
              channelName: data.name || 'Unnamed Channel',
              isLive: data.isLive || false,
              views: data.viewers || 0,
            } as RelatedShow;
          });
        setRelatedShows(related);
      } else {
        console.error('Channel not found:', params.id);
        setChannelData(null);
      }
    } catch (error) {
      console.error('Error fetching channel data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [params.id]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }

    fetchData();

  }, [fetchData, player]);

  // Initial loading state
  if (isLoading && !channelData) {
    return (
      <SafeAreaView className="flex-1">
        <Box className="w-full h-60">
          <Center className="h-full">
            <ActivityIndicator size="large" color="#ffffff" />
          </Center>
        </Box>
        <ChannelDetailsSkeleton />
        <Divider className="my-2" />
        <RelatedShowsSkeleton />
        <Divider className="my-2" />
        <AboutChannelSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <VideoPlayerSection player={player} />
      <Divider className="bg-gray-700" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {channelData && (
          <>
            <ChannelDetailsSection 
              channelData={channelData} 
              isLive={isLive} 
            />
            <Divider className="my-2 bg-gray-700" />
            <RelatedShowsSection 
              relatedShows={relatedShows.map(show => ({
                ...show,
                isLive: show.isLive ?? false
              }))} 
              isLoading={isLoading} 
            />
            <Divider className="my-2 bg-gray-700" />
            <AboutChannelSection 
              channelData={channelData} 
              isLoading={isLoading} 
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}