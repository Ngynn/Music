import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { Audio } from "expo-av";
// import * as Audio from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
} from "firebase/firestore";
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
  // Thêm thuộc tính và method mới
  currentSongId: string | null;
  isCurrentlyPlayingSong: (songId: string) => boolean;
  isBuffering: boolean; // Thêm thuộc tính này
}

// Khởi tạo context với đúng kiểu dữ liệu
const AudioContext = createContext<AudioContextType | null>(null);

// Định nghĩa kiểu prop cho AudioProvider
interface AudioProviderProps {
  children: ReactNode;
}

// Provider Component
export const AudioProvider = ({ children }: AudioProviderProps) => {
  // Di chuyển tất cả state từ useAudioPlayer vào đây
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
  const [recentlyViewedSongs, setRecentlyViewedSongs] = useState<{
    [key: string]: number;
  }>({});

  // Thêm state mới để lưu trữ ID bài hát đang phát
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);

  // Thêm state để theo dõi trạng thái buffer
  const [isBuffering, setIsBuffering] = useState(false);

  // Refs
  const isRepeatRef = useRef(isRepeat);
  const currentlyPlayingRef = useRef<number>(currentlyPlaying);
  const isHandlingSongEndRef = useRef(false);

  // Theo dõi trạng thái đăng nhập
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
        // Khi có người dùng đăng nhập, tải danh sách bài hát đã thích của họ
        loadLikedSongsForUser(user.uid);
      } else {
        setCurrentUserId(null);
        // Khi đăng xuất, xóa danh sách bài hát đã thích
        setLikedSongs(new Set());
      }
    });

    // Hủy đăng ký khi component bị unmount
    return () => unsubscribe();
  }, []);

  // Hàm tải danh sách bài hát đã thích cho người dùng cụ thể
  const loadLikedSongsForUser = async (userId: string) => {
    try {
      // 1. Tải từ AsyncStorage trước (cho trải nghiệm nhanh)
      const localKey = `likedSongs_${userId}`;
      const savedLocalLikedSongs = await AsyncStorage.getItem(localKey);

      if (savedLocalLikedSongs) {
        setLikedSongs(new Set(JSON.parse(savedLocalLikedSongs)));
      }

      // 2. Đồng thời tải từ Firestore để đảm bảo đồng bộ giữa các thiết bị
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().likedSongs) {
        const cloudLikedSongs = userDoc.data().likedSongs;
        setLikedSongs(new Set(cloudLikedSongs));
        // Cập nhật lại AsyncStorage với dữ liệu mới nhất từ cloud
        await AsyncStorage.setItem(localKey, JSON.stringify(cloudLikedSongs));
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách bài hát đã thích:", error);
    }
  };

  // Di chuyển useEffect và các hàm từ useAudioPlayer vào đây
  useEffect(() => {
    currentlyPlayingRef.current = currentlyPlaying;
  }, [currentlyPlaying]);

  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  // Load liked songs từ storage khi component mount
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

    // Cleanup khi unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Hàm kiểm tra bài hát có được thích không
  const isLiked = (songId: string) => {
    return likedSongs.has(songId);
  };

  // Hàm thêm/xóa bài hát khỏi danh sách yêu thích
  const handleLike = async (songId: string) => {
    // Nếu không có người dùng đăng nhập, có thể hiển thị thông báo yêu cầu đăng nhập
    if (!currentUserId) {
      console.log("Vui lòng đăng nhập để thích bài hát");
      // Có thể thêm việc hiển thị modal đăng nhập hoặc chuyển hướng
      return;
    }

    // Cập nhật trạng thái local
    setLikedSongs((prevLikedSongs) => {
      const newLikedSongs = new Set(prevLikedSongs);
      const isCurrentlyLiked = newLikedSongs.has(songId);

      // Cập nhật Set local
      if (isCurrentlyLiked) {
        newLikedSongs.delete(songId);
      } else {
        newLikedSongs.add(songId);
      }

      // Lưu vào AsyncStorage với key theo user ID
      const localKey = `likedSongs_${currentUserId}`;
      AsyncStorage.setItem(localKey, JSON.stringify([...newLikedSongs]));

      // Cập nhật Firestore cho user hiện tại
      updateUserLikedSongs(currentUserId, [...newLikedSongs]);

      // Cập nhật số lượt thích cho bài hát
      updateSongLikesInFirestore(songId, !isCurrentlyLiked);

      return newLikedSongs;
    });
  };

  // Hàm mới để cập nhật danh sách liked songs của user trên Firestore
  const updateUserLikedSongs = async (
    userId: string,
    likedSongsList: string[]
  ) => {
    try {
      const userDocRef = doc(db, "users", userId);

      // Kiểm tra xem document có tồn tại không
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Tạo document mới nếu chưa tồn tại
        await setDoc(userDocRef, {
          likedSongs: likedSongsList,
          updatedAt: new Date(),
        });
      } else {
        // Cập nhật document hiện có
        await updateDoc(userDocRef, {
          likedSongs: likedSongsList,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật bài hát yêu thích trên cloud:", error);
    }
  };

  // Hàm riêng để cập nhật Firestore
  const updateSongLikesInFirestore = async (
    songId: string,
    isLiking: boolean
  ) => {
    try {
      // Tham chiếu đến document của bài hát
      const songRef = doc(db, "song", songId);

      // Kiểm tra xem document có tồn tại không
      const songDoc = await getDoc(songRef);
      if (!songDoc.exists()) {
        console.error("Bài hát không tồn tại trong Firestore");
        return;
      }

      // Xử lý khác nhau cho like và unlike
      if (isLiking) {
        // Khi like: đơn giản là tăng giá trị lên 1, hoặc đặt thành 1 nếu chưa có
        await updateDoc(songRef, {
          likes: increment(1),
        });
        console.log(`Đã thêm lượt thích cho bài hát ID: ${songId}`);
      } else {
        // Khi unlike: cần kiểm tra giá trị hiện tại để tránh số âm
        const currentData = songDoc.data();
        const currentLikes = currentData?.likes || 0;

        if (currentLikes > 0) {
          // Chỉ giảm khi giá trị hiện tại lớn hơn 0
          await updateDoc(songRef, {
            likes: increment(-1),
          });
          console.log(`Đã xóa lượt thích cho bài hát ID: ${songId}`);
        } else {
          // Trường hợp không có trường likes hoặc likes đã là 0, đảm bảo là 0
          await updateDoc(songRef, {
            likes: 0,
          });
          console.log(`Giữ nguyên lượt thích là 0 cho bài hát ID: ${songId}`);
        }
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật lượt thích trên Firestore:", error);
    }
  };

  // Hàm bật tắt chế độ lặp lại
  const toggleRepeat = async () => {
    setIsRepeat((prev) => {
      const newState = !prev;
      isRepeatRef.current = newState;

      if (sound) {
        sound
          .setIsLoopingAsync(newState)
          .then(() =>
            console.log(`Đã ${newState ? "bật" : "tắt"} chế độ lặp lại`)
          )
          .catch((error) =>
            console.error("Lỗi khi thiết lập chế độ lặp:", error)
          );
      }

      return newState;
    });
  };

  // Hàm tạm dừng/tiếp tục phát nhạc
  const pauseOrResume = async () => {
    if (sound) {
      try {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error("Lỗi khi tạm dừng/phát nhạc:", error);
      }
    }
  };

  // Thêm hàm helper để kiểm tra bài hát đang phát
  const isCurrentlyPlayingSong = (songId: string): boolean => {
    return currentSongId === songId;
  };

  // Thêm hàm tối ưu URL Cloudinary
  const optimizeCloudinaryAudioUrl = (originalUrl: string) => {
    // Kiểm tra xem URL có phải từ Cloudinary không
    if (!originalUrl.includes("cloudinary.com")) return originalUrl;

    // Thêm các tham số chất lượng
    // fl_attachment: Cho phép tải xuống trong trình phát
    // q_auto: Tự động điều chỉnh chất lượng
    // f_mp3: Định dạng mp3
    const optimizedUrl = originalUrl.replace(
      "/upload/",
      "/upload/fl_attachment,q_auto/"
    );

    return optimizedUrl;
  };

  const arraysEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false;
    return a.every((song, index) => song.id === b[index].id);
  };

  // Hàm phát nhạc mới (đã cập nhật)
  const playSound = async (
    songs: any[],
    index: number,
    options: { skipViewIncrement?: boolean } = {}
  ) => {
    console.log(`Đang phát bài hát ở index: ${index}`);
    setCurrentSongList(songs);

    if (!arraysEqual(currentSongList, songs)) {
      setCurrentSongList(songs);
    }

    try {
      const song = songs[index];
      console.log("Đang tải bài hát:", song.name);

      // Lưu ID của bài hát đang phát
      setCurrentSongId(song.id);

      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Tối ưu URL
      const optimizedAudioUrl = optimizeCloudinaryAudioUrl(song.audio);

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
        { uri: optimizedAudioUrl },
        playbackConfig,
        (status) => {
          if (status.isLoaded) {
            const newPosition = status.positionMillis || 0;
            if (Math.abs(newPosition - currentPosition) > 1000) {
              setCurrentPosition(newPosition);
            }

            const newDuration = status.durationMillis || 0;
            if (Math.abs(newDuration - duration) > 1000) {
              setDuration(newDuration);
            }

            if (status.isBuffering !== undefined) {
              setIsBuffering(status.isBuffering);
            }

            if (status.didJustFinish && !isHandlingSongEndRef.current) {
              console.log("Bài hát đã kết thúc.");
              isHandlingSongEndRef.current = true;
              handleSongEnd().then(() => {
                setTimeout(() => {
                  isHandlingSongEndRef.current = false;
                }, 1000);
              });
            }
          }
        }
      );

      setSound(newSound);
      setCurrentSong(song);
      setCurrentlyPlaying(index);
      setIsPlaying(true);

      // ✅ Chỉ tăng lượt xem nếu không phải admin preview
      if (!options.skipViewIncrement && !song.isAdminPreview) {
        incrementSongView(song.id);
      }

      // Tiền tải bài hát kế tiếp
      if (index < songs.length - 1) {
        setTimeout(() => preloadNextSong(songs, index), 3000);
      }
    } catch (error) {
      console.error("Lỗi khi phát nhạc:", error);
    }
  };

  // Thêm hàm tiền tải bài hát tiếp theo
  const preloadNextSong = async (songs: any[], currentIndex: number) => {
    if (currentIndex < songs.length - 1) {
      try {
        const nextSong = songs[currentIndex + 1];
        console.log("Đang tiền tải bài hát tiếp theo:", nextSong.name);

        const optimizedAudioUrl = optimizeCloudinaryAudioUrl(nextSong.audio);

        // Chỉ tải metadata, không phát
        await Audio.Sound.createAsync(
          { uri: optimizedAudioUrl },
          { shouldPlay: false },
          null
        );
      } catch (error) {
        console.log("Lỗi khi tiền tải bài hát:", error);
      }
    }
  };

  // Thêm cấu hình Audio Mode khi khởi động ứng dụng
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true, // Để nhạc chạy trong nền
          shouldDuckAndroid: true, // Giảm âm lượng khi có thông báo trên Android
          playThroughEarpieceAndroid: false, // Phát qua loa ngoài Android
        });
        console.log("Đã thiết lập cấu hình âm thanh thành công");
      } catch (error) {
        console.error("Lỗi khi thiết lập cấu hình âm thanh:", error);
      }
    };

    setupAudio();
  }, []);

  // Tăng lượt xem cho bài hát
  const incrementSongView = async (songId: string) => {
    try {
      // Kiểm tra xem bài hát đã được xem gần đây chưa
      const now = Date.now();
      const lastViewed = recentlyViewedSongs[songId] || 0;

      // Chỉ tăng view nếu người dùng chưa xem bài hát này trong 1 giờ gần đây
      if (now - lastViewed > 3600000) {
        // Cập nhật danh sách bài hát đã xem
        setRecentlyViewedSongs((prev) => ({
          ...prev,
          [songId]: now,
        }));

        // Phần còn lại của hàm như trước
        const songRef = doc(db, "song", songId);

        // Kiểm tra xem song có tồn tại không
        const songDoc = await getDoc(songRef);
        if (!songDoc.exists()) {
          console.error("Bài hát không tồn tại trong Firestore");
          return;
        }

        // Lấy dữ liệu hiện tại
        const songData = songDoc.data();

        // Nếu trường views chưa tồn tại, tạo mới với giá trị 1
        if (songData.views === undefined) {
          await updateDoc(songRef, {
            views: 1,
          });
          console.log(
            `Tạo mới trường views cho bài hát ID: ${songId} với giá trị 1`
          );
        } else {
          // Nếu đã tồn tại, tăng thêm 1
          await updateDoc(songRef, {
            views: increment(1),
          });
          console.log(
            `Tăng lượt xem cho bài hát ID: ${songId} từ ${songData.views} lên ${
              songData.views + 1
            }`
          );
        }
      } else {
        console.log("Bài hát đã được xem gần đây, không tăng lượt view");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật lượt xem:", error);
    }
  };

  // Chuyển đổi chế độ phát
  const togglePlaybackMode = () => {
    setPlaybackMode((prev) =>
      prev === "sequential" ? "random" : "sequential"
    );
  };

  // Cập nhật handleSongEnd để thiết lập currentSongId khi tự động chuyển bài
  const handleSongEnd = async () => {
    console.log("=== DEBUG INFO ===");
    console.log("currentlyPlayingRef.current:", currentlyPlayingRef.current);
    console.log("currentSongList length:", currentSongList.length);

    if (isRepeatRef.current) {
      console.log("Bài hát đang ở chế độ lặp lại.");
      return;
    }

    if (!autoPlayEnabled) {
      console.log("Tự động phát đã bị tắt");
      return;
    }

    const currentIndex = currentlyPlayingRef.current;

    if (currentIndex < 0) {
      console.error("Index bài hát hiện tại không xác định");
      return;
    }

    if (playbackMode === "sequential") {
      if (currentIndex < currentSongList.length - 1) {
        const nextIndex = currentIndex + 1;
        console.log("Auto: Chuyển đến bài tiếp theo:", nextIndex);
        // Cập nhật currentSongId trước khi phát
        if (currentSongList[nextIndex] && currentSongList[nextIndex].id) {
          setCurrentSongId(currentSongList[nextIndex].id);
        }

        setCurrentlyPlaying(nextIndex);
        setTimeout(() => {
          // Không cần thay đổi trạng thái showPlayer, giữ nguyên trạng thái hiện tại
          playSound(currentSongList, nextIndex);
        }, 300);
      } else {
        console.log("Đã phát hết danh sách.");
      }
    } else {
      const randomIndex = Math.floor(Math.random() * currentSongList.length);
      console.log("Auto: Chuyển đến bài ngẫu nhiên:", randomIndex);

      // Cập nhật currentSongId trước khi phát
      if (currentSongList[randomIndex] && currentSongList[randomIndex].id) {
        setCurrentSongId(currentSongList[randomIndex].id);
      }

      setCurrentlyPlaying(randomIndex);
      setTimeout(() => {
        // Giữ nguyên trạng thái hiển thị hiện tại
        playSound(currentSongList, randomIndex);
      }, 300);
    }
  };

  // Cập nhật playNext và playPrevious để cập nhật currentSongId
  const playNext = async () => {
    if (currentlyPlaying < 0) {
      console.error("Không có bài hát đang phát.");
      return;
    }

    if (currentlyPlaying < currentSongList.length - 1) {
      const nextIndex = currentlyPlaying + 1;
      console.log("Chuyển đến bài tiếp theo:", nextIndex);

      // Cập nhật currentSongId trước khi phát
      if (currentSongList[nextIndex] && currentSongList[nextIndex].id) {
        setCurrentSongId(currentSongList[nextIndex].id);
      }

      await playSound(currentSongList, nextIndex);
    } else {
      console.log("Đây là bài hát cuối cùng.");
    }
  };

  const playPrevious = async () => {
    if (currentlyPlaying < 0) {
      console.error("Không có bài hát đang phát.");
      return;
    }

    if (currentlyPlaying > 0) {
      const prevIndex = currentlyPlaying - 1;
      console.log("Chuyển đến bài trước đó:", prevIndex);

      // Cập nhật currentSongId trước khi phát
      if (currentSongList[prevIndex] && currentSongList[prevIndex].id) {
        setCurrentSongId(currentSongList[prevIndex].id);
      }

      await playSound(currentSongList, prevIndex);
    } else {
      console.log("Đây là bài hát đầu tiên.");
    }
  };

  // Di chuyển đến vị trí cụ thể trong bài hát
  const seekToPosition = async (position: number) => {
    if (sound) {
      try {
        await sound.setPositionAsync(position);
        setCurrentPosition(position);
      } catch (error) {
        console.error("Lỗi khi điều chỉnh vị trí phát:", error);
      }
    }
  };

  // Tạo giá trị Context
  const value = {
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
    // Thêm vào giá trị trả về của context
    currentSongId,
    isCurrentlyPlayingSong,
    isBuffering,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
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

export default function AudioContextComponent() {
  // Đây là một component giả để thỏa mãn yêu cầu default export
  return null;
}
