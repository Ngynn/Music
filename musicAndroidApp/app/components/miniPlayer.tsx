import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ProgressBar } from "react-native-paper";
import { COLORS } from "../constants/theme";

interface MiniPlayerProps {
  currentSong: any;
  isPlaying: boolean;
  onPlayPause: () => void;
  onOpen: () => void;
  duration: number;
  currentPosition: number;
  onLayout?: (event: any) => void;
  isAdminPreview?: boolean;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentSong,
  isPlaying,
  onPlayPause,
  onOpen,
  duration,
  currentPosition,
  onLayout,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (duration > 0) {
      setProgress(currentPosition / duration);
    }
  }, [currentPosition, duration]);

  return (
    <TouchableOpacity
      style={styles.miniPlayer}
      onPress={onOpen}
      onLayout={onLayout}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: currentSong?.img }}
        style={styles.miniPlayerImage}
      />
      <View style={styles.miniPlayerDetails}>
        <Text style={styles.miniPlayerName}>{currentSong?.name}</Text>
        <Text style={styles.miniPlayerArtist}>{currentSong?.artist}</Text>
        <ProgressBar
          progress={progress}
          color={COLORS.primary}
          style={styles.progressBar}
        />
      </View>
      <TouchableOpacity
        style={styles.playButton}
        onPress={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
      >
        <Icon
          name={isPlaying ? "pause" : "play-arrow"}
          size={30}
          color={COLORS.text}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  miniPlayer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    padding: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    height: 80,
    zIndex: 999,
    borderRadius: 8,
  },
  miniPlayerImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  miniPlayerDetails: {
    flex: 1,
    justifyContent: "center",
  },
  miniPlayerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  miniPlayerArtist: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.progressBg,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.hoverBg,
  },
});

export default MiniPlayer;
