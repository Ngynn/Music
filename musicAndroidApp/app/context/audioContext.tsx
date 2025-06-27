import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";

// Cập nhật interface để thêm các thuộc tính và method mới
interface AudioContextType {
  sound: Audio.Sound | null;
  playSound: (
    songs: any[],
    index: number,
    options?: { skipViewIncrement?: boolean }
  ) => Promise<void>;
  pauseOrResume: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
  isPlaying: boolean;
  isRepeat: boolean;
  currentSong: any | null;
  currentPosition: number;
  duration: number;
  currentlyPlaying: number;
  showPlayer: boolean;
  setShowPlayer: (show: boolean) => void;
  handleLike: (songId: string) => void;
  isLiked: (songId: string) => boolean;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekToPosition: (position: number) => Promise<void>;
  setCurrentlyPlaying: React.Dispatch<React.SetStateAction<number>>;
  setCurrentSongList: React.Dispatch<React.SetStateAction<any[]>>;
  playbackMode: "sequential" | "random";
  togglePlaybackMode: () => void;
  autoPlayEnabled: boolean;
  likedSongs: Set<string>;
  currentSongId: string | null;
  isCurrentlyPlayingSong: (songId: string) => boolean;
  isBuffering: boolean;
}

// Khởi tạo context với đúng kiểu dữ liệu
const AudioContext = createContext<AudioContextType | null>(null);

// Định nghĩa kiểu prop cho AudioProvider
interface AudioProviderProps {
  children: ReactNode;
}

// Provider Component
export const AudioProvider = ({ children }: AudioProviderProps) => {
  // State declarations
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number>(-1);
  const [currentSong, setCurrentSong] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const [currentSongList, setCurrentSongList] = useState<any[]>([]);
  const [playbackMode, setPlaybackMode] = useState<"sequential" | "random">(
    "sequential"
  );
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // Refs để tránh stale closure
  const isRepeatRef = useRef(isRepeat);
  const currentlyPlayingRef = useRef<number>(currentlyPlaying);
  const isHandlingSongEndRef = useRef(false);
  const currentSongListRef = useRef<any[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentPositionRef = useRef(currentPosition);
  const durationRef = useRef(duration);

  // **FIX 1: Sync tất cả refs với state**
  useEffect(() => {
    currentSongListRef.current = currentSongList;
  }, [currentSongList]);

  useEffect(() => {
    currentlyPlayingRef.current = currentlyPlaying;
  }, [currentlyPlaying]);

  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    currentPositionRef.current = currentPosition;
  }, [currentPosition]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // **FIX 2: Setup Audio - chỉ chạy một lần**
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log("Đã thiết lập cấu hình âm thanh thành công");
      } catch (error) {
        console.error("Lỗi khi thiết lập cấu hình âm thanh:", error);
      }
    };

    setupAudio();

    // Cleanup khi unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []); // **Empty dependency array**

  // **FIX 3: Load liked songs - chỉ chạy một lần**
  useEffect(() => {
    const loadLikedSongs = async () => {
      try {
        const savedLikedSongs = await AsyncStorage.getItem("likedSongs");
        if (savedLikedSongs) {
          setLikedSongs(new Set(JSON.parse(savedLikedSongs)));
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách bài hát đã thích:", error);
      }
    };

    loadLikedSongs();
  }, []); // **Empty dependency array**

  // **FIX 4: Auth state listener - chỉ chạy một lần**
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        // Load liked songs từ Firestore
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data && Array.isArray(data.likedSongs)) {
              setLikedSongs(new Set(data.likedSongs));
              await AsyncStorage.setItem(
                "likedSongs",
                JSON.stringify(data.likedSongs)
              );
            }
          }
        } catch (error) {
          console.error(
            "Lỗi khi tải danh sách bài hát đã thích từ Firestore:",
            error
          );
        }
      } else {
        setCurrentUserId(null);
        setLikedSongs(new Set());
      }
    });

    return () => unsubscribe();
  }, []); // **Empty dependency array**

  // **FIX 5: Memoize pure functions với empty dependencies**
  const incrementSongView = useCallback(async (songId: string) => {
    try {
      const songRef = doc(db, "song", songId);
      await updateDoc(songRef, {
        views: increment(1),
      });
      console.log(`Đã tăng lượt xem cho bài hát: ${songId}`);
    } catch (error) {
      console.error("Lỗi khi tăng lượt xem bài hát:", error);
    }
  }, []);

  const preloadNextSong = useCallback(
    async (songs: any[], currentIndex: number) => {
      if (currentIndex < songs.length - 1) {
        try {
          const nextSong = songs[currentIndex + 1];
          console.log("Đang tiền tải bài hát tiếp theo:", nextSong.name);

          const audioUrl = nextSong.audio || nextSong.url;
          if (!audioUrl) {
            console.log("Không có URL âm thanh để preload:", nextSong.name);
            return;
          }

          await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: false },
            null
          );

          console.log("Đã preload thành công:", nextSong.name);
        } catch (error) {
          console.log("Lỗi khi tiền tải bài hát:", error);
        }
      }
    },
    []
  );

  // **FIX 6: Tách handleSongEnd thành function riêng biệt**
  const handleSongEnd = useCallback(() => {
    console.log("=== DEBUG INFO ===");
    console.log("currentlyPlayingRef.current:", currentlyPlayingRef.current);
    console.log("currentSongList length:", currentSongListRef.current.length);

    if (isRepeatRef.current) {
      console.log("Bài hát đang ở chế độ lặp lại.");
      return;
    }

    if (!autoPlayEnabled) {
      console.log("Tự động phát đã bị tắt");
      return;
    }

    const currentIndex = currentlyPlayingRef.current;
    const songList = currentSongListRef.current;

    if (currentIndex < 0 || songList.length === 0) {
      console.error(
        "Index bài hát hiện tại không xác định hoặc danh sách rỗng"
      );
      return;
    }

    let nextIndex: number;

    if (playbackMode === "sequential") {
      if (currentIndex < songList.length - 1) {
        nextIndex = currentIndex + 1;
        console.log("Auto: Chuyển đến bài tiếp theo:", nextIndex);
      } else {
        console.log("Đã phát hết danh sách.");
        return;
      }
    } else {
      nextIndex = Math.floor(Math.random() * songList.length);
      console.log("Auto: Chuyển đến bài ngẫu nhiên:", nextIndex);
    }

    // Chỉ update state, không gọi playSound
    if (songList[nextIndex] && songList[nextIndex].id) {
      setCurrentSongId(songList[nextIndex].id);
    }
    setCurrentlyPlaying(nextIndex);

    // Trigger playSound thông qua một flag khác
    setTimeout(() => {
      playSound(songList, nextIndex).catch(console.error);
    }, 100);
  }, [autoPlayEnabled, playbackMode]);

  // **FIX 7: Tối ưu playSound function**
  const playSound = useCallback(
    async (
      songs: any[],
      index: number,
      options: { skipViewIncrement?: boolean } = {}
    ) => {
      console.log(`Đang phát bài hát ở index: ${index}`);

      try {
        const song = songs[index];
        if (!song) {
          console.error("Không tìm thấy bài hát tại index:", index);
          return;
        }

        console.log("Đang tải bài hát:", song.name);

        const audioUrl = song.audio || song.url;
        if (!audioUrl) {
          console.error("Không tìm thấy URL âm thanh cho bài hát:", song.name);
          return;
        }

        console.log("Audio URL:", audioUrl);

        // Update state
        setCurrentSongList(songs);
        setCurrentSongId(song.id);
        setCurrentSong(song);
        setCurrentlyPlaying(index);

        // Unload previous sound
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          setSound(null);
        }

        const playbackConfig = {
          shouldPlay: true,
          isLooping: isRepeatRef.current,
          progressUpdateIntervalMillis: 100,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
          playsInSilentModeIOS: true,
        };

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          playbackConfig,
          (status) => {
            if (status.isLoaded) {
              const newPosition = status.positionMillis || 0;
              const newDuration = status.durationMillis || 0;

              // Chỉ update khi có sự thay đổi đáng kể
              if (Math.abs(newPosition - currentPositionRef.current) > 1000) {
                setCurrentPosition(newPosition);
              }

              if (Math.abs(newDuration - durationRef.current) > 1000) {
                setDuration(newDuration);
              }

              if (status.isBuffering !== undefined) {
                setIsBuffering(status.isBuffering);
              }

              if (status.didJustFinish && !isHandlingSongEndRef.current) {
                console.log("Bài hát đã kết thúc.");
                isHandlingSongEndRef.current = true;

                setTimeout(() => {
                  handleSongEnd();
                  setTimeout(() => {
                    isHandlingSongEndRef.current = false;
                  }, 1000);
                }, 300);
              }
            } else if (status.error) {
              console.error("Lỗi khi tải âm thanh:", status.error);
              setIsPlaying(false);
              setIsBuffering(false);
            }
          }
        );

        setSound(newSound);
        setIsPlaying(true);

        if (!options.skipViewIncrement) {
          incrementSongView(song.id);
        }

        // Preload next song
        if (index < songs.length - 1) {
          setTimeout(() => preloadNextSong(songs, index), 3000);
        }
      } catch (error) {
        console.error("Lỗi khi phát nhạc:", error);
        setIsPlaying(false);
        setIsBuffering(false);
      }
    },
    [handleSongEnd, incrementSongView, preloadNextSong]
  );

  // **FIX 8: Các functions khác với dependencies ổn định**
  const pauseOrResume = useCallback(async () => {
    if (soundRef.current) {
      try {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error("Lỗi khi tạm dừng/phát nhạc:", error);
      }
    }
  }, [isPlaying]);

  const toggleRepeat = useCallback(async () => {
    const newRepeatState = !isRepeatRef.current;
    setIsRepeat(newRepeatState);

    if (soundRef.current) {
      try {
        await soundRef.current.setIsLoopingAsync(newRepeatState);
      } catch (error) {
        console.error("Lỗi khi chuyển đổi chế độ lặp lại:", error);
      }
    }
  }, []);

  const seekToPosition = useCallback(async (position: number) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setPositionAsync(position);
        setCurrentPosition(position);
      } catch (error) {
        console.error("Lỗi khi điều chỉnh vị trí phát:", error);
      }
    }
  }, []);

  const playNext = useCallback(async () => {
    const currentIndex = currentlyPlayingRef.current;
    const songList = currentSongListRef.current;

    if (currentIndex < 0 || songList.length === 0) {
      console.error("Không có bài hát đang phát.");
      return;
    }

    if (currentIndex < songList.length - 1) {
      const nextIndex = currentIndex + 1;
      console.log("Chuyển đến bài tiếp theo:", nextIndex);
      await playSound(songList, nextIndex);
    } else {
      console.log("Đây là bài hát cuối cùng.");
    }
  }, [playSound]);

  const playPrevious = useCallback(async () => {
    const currentIndex = currentlyPlayingRef.current;
    const songList = currentSongListRef.current;

    if (currentIndex < 0 || songList.length === 0) {
      console.error("Không có bài hát đang phát.");
      return;
    }

    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      console.log("Chuyển đến bài trước đó:", prevIndex);
      await playSound(songList, prevIndex);
    } else {
      console.log("Đây là bài hát đầu tiên.");
    }
  }, [playSound]);

  const handleLike = useCallback(
    async (songId: string) => {
      try {
        const newLikedSongs = new Set(likedSongs);

        if (newLikedSongs.has(songId)) {
          newLikedSongs.delete(songId);
        } else {
          newLikedSongs.add(songId);
        }

        setLikedSongs(newLikedSongs);

        // Save to AsyncStorage
        await AsyncStorage.setItem(
          "likedSongs",
          JSON.stringify(Array.from(newLikedSongs))
        );

        // Save to Firestore
        if (currentUserId) {
          const userDocRef = doc(db, "users", currentUserId);
          await setDoc(
            userDocRef,
            { likedSongs: Array.from(newLikedSongs) },
            { merge: true }
          );
        }
      } catch (error) {
        console.error("Lỗi khi xử lý thích bài hát:", error);
      }
    },
    [likedSongs, currentUserId]
  );

  const isLiked = useCallback(
    (songId: string) => {
      return likedSongs.has(songId);
    },
    [likedSongs]
  );

  const isCurrentlyPlayingSong = useCallback(
    (songId: string) => {
      return currentSongId === songId;
    },
    [currentSongId]
  );

  const togglePlaybackMode = useCallback(() => {
    setPlaybackMode((prev) =>
      prev === "sequential" ? "random" : "sequential"
    );
  }, []);

  // **FIX 9: Memoize context value**
  const contextValue = useMemo(
    () => ({
      sound,
      playSound,
      pauseOrResume,
      toggleRepeat,
      isPlaying,
      isRepeat,
      currentSong,
      currentPosition,
      duration,
      currentlyPlaying,
      showPlayer,
      setShowPlayer,
      handleLike,
      isLiked,
      playNext,
      playPrevious,
      seekToPosition,
      setCurrentlyPlaying,
      setCurrentSongList,
      playbackMode,
      togglePlaybackMode,
      autoPlayEnabled,
      likedSongs,
      currentSongId,
      isCurrentlyPlayingSong,
      isBuffering,
    }),
    [
      sound,
      playSound,
      pauseOrResume,
      toggleRepeat,
      isPlaying,
      isRepeat,
      currentSong,
      currentPosition,
      duration,
      currentlyPlaying,
      showPlayer,
      handleLike,
      isLiked,
      playNext,
      playPrevious,
      seekToPosition,
      playbackMode,
      togglePlaybackMode,
      autoPlayEnabled,
      likedSongs,
      currentSongId,
      isCurrentlyPlayingSong,
      isBuffering,
    ]
  );

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};

// Custom hook để sử dụng AudioContext
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio phải được sử dụng trong AudioProvider");
  }
  return context;
};

export default AudioContextComponent;

function AudioContextComponent() {
  return null;
}
