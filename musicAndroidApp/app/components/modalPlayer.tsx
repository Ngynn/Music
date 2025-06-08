import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Slider from "@react-native-community/slider";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS } from "../constants/theme";
import MenuOptions from "../context/menuOptions"; // Import MenuOptions component

const { width, height } = Dimensions.get("window");

// Thêm props mới
interface ModalPlayerProps {
  visible: boolean;
  currentSong: any;
  isPlaying: boolean;
  duration: number;
  currentPosition: number;
  isRepeat: boolean;
  playbackMode: string;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (value: number) => void;
  onToggleRepeat: () => void;
  onTogglePlaybackMode: () => void;
  onLike: () => void;
  isLiked: boolean;

  // Các props hiện có
  userPlaylists?: any[];
  loadingPlaylists?: boolean;
  onAddToPlaylist?: (playlistId: string, songId: string) => void;
  onRemoveFromPlaylist?: (playlistId: string, songId: string) => void;
  checkSongInPlaylist?: (songId: string, playlistId: string) => boolean;
}

const ModalPlayer: React.FC<ModalPlayerProps> = ({
  visible,
  currentSong,
  isPlaying,
  duration,
  currentPosition,
  isRepeat,
  playbackMode,
  onClose,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onToggleRepeat,
  onTogglePlaybackMode,
  onLike,
  isLiked,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Format time function
  const formatTime = (ms: number) => {
    if (!ms) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  // Format number function (chỉ hiển thị khi không phải admin preview)
  const formatNumber = (num: number): string => {
    if (!num && num !== 0) return "0";

    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    } else if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    } else {
      return num.toString();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {currentSong && (
        <View style={styles.modalContainer}>
          {/* Header với điều kiện admin preview */}
          <View style={styles.headerContainer}>
            {/* Nút thu nhỏ */}
            <TouchableOpacity style={styles.minimizeButton} onPress={onClose}>
              <Icon name="expand-more" size={30} color={COLORS.text} />
            </TouchableOpacity>

            {/* Nút More Options - chỉ hiển thị cho user */}
            {
              <TouchableOpacity
                style={styles.moreOptionsButton}
                onPress={() => setShowMenu(true)}
              >
                <Icon name="more-vert" size={30} color={COLORS.text} />
              </TouchableOpacity>
            }
          </View>

          {/* Hình ảnh bài hát */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: currentSong.img }}
              style={styles.modalImage}
            />
          </View>

          {/* Thông tin bài hát */}
          <View style={styles.infoContainer}>
            <Text style={styles.modalSongName}>{currentSong.name}</Text>
            <Text style={styles.modalArtist}>{currentSong.artist}</Text>

            {/* Thống kê - chỉ hiển thị cho user */}
            {
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Icon name="favorite" size={16} color={COLORS.primary} />
                  <Text style={styles.statText}>
                    {formatNumber(currentSong.likes || 0)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Icon
                    name="visibility"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.statText}>
                    {formatNumber(currentSong.views || 0)}
                  </Text>
                </View>
              </View>
            }
          </View>

          {/* Cụm nút chức năng trên - có điều kiện */}
          <View style={styles.topButtons}>
            {/* Nút Like - chỉ hiển thị cho user */}
            {
              <TouchableOpacity style={styles.iconButton} onPress={onLike}>
                <Icon
                  name={isLiked ? "favorite" : "favorite-border"}
                  size={28}
                  color={isLiked ? COLORS.primary : COLORS.text}
                />
              </TouchableOpacity>
            }

            {/* Nút Repeat - chỉ hiển thị cho user */}
            {
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onToggleRepeat}
              >
                <Icon
                  name="repeat"
                  size={28}
                  color={isRepeat ? COLORS.primary : COLORS.text}
                />
              </TouchableOpacity>
            }
          </View>

          {/* Slider điều chỉnh thời gian */}
          <View style={styles.progressContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={currentPosition}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.progressBg}
              thumbTintColor={COLORS.primary}
              onSlidingComplete={onSeek}
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Cụm nút điều khiển chính */}
          <View style={styles.controlButtons}>
            <TouchableOpacity style={styles.controlButton} onPress={onPrevious}>
              <Icon name="skip-previous" size={48} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playPauseButton]}
              onPress={onPlayPause}
            >
              <Icon
                name={isPlaying ? "pause" : "play-arrow"}
                size={40}
                color={COLORS.background}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={onNext}>
              <Icon name="skip-next" size={48} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* MenuOptions - chỉ hiển thị cho user */}
          {currentSong && (
            <MenuOptions
              visible={showMenu}
              onClose={() => setShowMenu(false)}
              songId={currentSong.id}
              songName={currentSong.name}
              songArtist={currentSong.artist}
              songImage={currentSong.img}
            />
          )}
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  minimizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.hoverBg,
    justifyContent: "center",
    alignItems: "center",
  },
  moreOptionsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.hoverBg,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    marginTop: 60,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: COLORS.cardBg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  infoContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  modalSongName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 6,
  },
  modalArtist: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },

  // Thêm styles mới cho phần thống kê
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.hoverBg,
    borderRadius: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  statText: {
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 5,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.divider || "#555",
    marginHorizontal: 8,
  },

  modalInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  progressContainer: {
    width: "100%",
    marginTop: 20,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: -5,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  topButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "80%",
    marginTop: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.hoverBg,
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 30,
    marginBottom: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContainer: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  adminPreviewBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  adminPreviewText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  adminInfoContainer: {
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  adminInfoText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 8,
  },
  adminMetaInfo: {
    backgroundColor: COLORS.hoverBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  adminMetaText: {
    color: COLORS.text,
    fontSize: 12,
    marginVertical: 2,
  },
  adminIconButton: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  adminIconText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  adminPlayPauseButton: {
    backgroundColor: COLORS.primary + "CC", // Slightly transparent for admin
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
});

export default ModalPlayer;
