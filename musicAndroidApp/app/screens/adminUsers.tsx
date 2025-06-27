import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Image,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { COLORS, SIZES } from "../constants/theme";
import { router } from "expo-router";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAlert } from "../context/alertContext";

// dinh nghia kieu du lieu
interface User {
  id: string;
  email: string;
  fullName?: string;
  photoURL?: string;
  role: "user" | "admin";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  phoneNumber?: string;
  likedSongs?: string[];
  // Computed fields
  totalLikedSongs?: number;
  lastLoginAt?: Timestamp;
}

interface EditUserData {
  fullName: string;
  email: string;
  role: "user" | "admin";
  phoneNumber: string;
}

interface UserStats {
  totalUsers: number;
  adminUsers: number;
  totalLikedSongs: number;
}

export default function AdminUsers() {
  const { confirm, success, error } = useAlert();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "user" | "admin">("all");
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    adminUsers: 0,
    totalLikedSongs: 0,
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editData, setEditData] = useState<EditUserData>({
    fullName: "",
    email: "",
    role: "user",
    phoneNumber: "",
  });
  const [updating, setUpdating] = useState(false);

  // lay danh sach nguoi dung tu firestore
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const usersData: User[] = [];
      let totalLikedSongs = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<User, "id">;

        // Tính số bài hát đã thích
        const likedSongsCount = data.likedSongs?.length || 0;
        totalLikedSongs += likedSongsCount;

        usersData.push({
          id: doc.id,
          ...data,
          totalLikedSongs: likedSongsCount,
        });
      });

      setUsers(usersData);

      const stats: UserStats = {
        totalUsers: usersData.length,
        adminUsers: usersData.filter((u) => u.role === "admin").length,
        totalLikedSongs,
      };
      setUserStats(stats);

      console.log(`✅ Fetched ${usersData.length} users`);
    } catch (err) {
      console.error("❌ Error fetching users:", err);
      error("Lỗi", "Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, [error]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // loc danh sach nguoi dung theo search query va role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === "all" || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  // open modal chỉnh sửa người dùng
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditData({
      fullName: user.fullName || "",
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber || "",
    });
    setShowEditModal(true);
  };

  // open modal hiển thị chi tiết người dùng
  const openUserDetailModal = (user: User) => {
    setSelectedUser(user);
    setShowUserDetailModal(true);
  };

  // update thông tin người dùng
  const updateUser = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);

      const userRef = doc(db, "users", selectedUser.id);
      const updateData: any = {
        fullName: editData.fullName,
        role: editData.role,
        phoneNumber: editData.phoneNumber,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(userRef, updateData);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === selectedUser.id
            ? { ...user, ...editData, updatedAt: Timestamp.now() }
            : user
        )
      );

      setShowEditModal(false);
      success("Thành công", "Thông tin người dùng đã được cập nhật");

      // Recalculate stats
      await fetchUsers();
    } catch (err) {
      console.error("❌ Error updating user:", err);
      error("Lỗi", "Không thể cập nhật thông tin người dùng");
    } finally {
      setUpdating(false);
    }
  };

  // xoa tài khoản người dùng
  const deleteUserAccount = async (user: User) => {
    confirm(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa tài khoản của ${
        user.fullName || user.email
      }?\n\nHành động này sẽ xóa:\n- Tất cả playlist của người dùng\n- Danh sách bài hát yêu thích\n- Dữ liệu người dùng\n\nKhông thể hoàn tác!`,
      async () => {
        try {
          // Delete user's playlists (nếu có collection playlists)
          const playlistsRef = collection(db, "playlists");
          const playlistQuery = query(
            playlistsRef,
            where("userId", "==", user.id)
          );

          const playlistSnapshot = await getDocs(playlistQuery);
          const deletePromises = playlistSnapshot.docs.map((doc) =>
            deleteDoc(doc.ref)
          );

          // Execute playlist deletions
          await Promise.all(deletePromises);

          // Delete user document
          const userRef = doc(db, "users", user.id);
          await deleteDoc(userRef);

          setUsers((prevUsers) => prevUsers.filter((u) => u.id !== user.id));
          success("Thành công", "Tài khoản và dữ liệu liên quan đã được xóa");

          // Recalculate stats
          await fetchUsers();
        } catch (err) {
          console.error("❌ Error deleting user:", err);
          error("Lỗi", "Không thể xóa tài khoản");
        }
      }
    );
  };

  // nang cap cho nguoi dung thanh admin
  const promoteToAdmin = async (user: User) => {
    confirm(
      "Cấp quyền Admin",
      `Cấp quyền Admin cho ${
        user.fullName || user.email
      }?\n\nNgười dùng sẽ có:\n- Quyền quản lý người dùng\n- Quyền quản lý nội dung\n- Truy cập admin panel\n- Toàn quyền hệ thống`,
      async () => {
        try {
          const userRef = doc(db, "users", user.id);

          await updateDoc(userRef, {
            role: "admin",
            updatedAt: Timestamp.now(),
          });

          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.id === user.id ? { ...u, role: "admin" } : u
            )
          );

          success("Thành công", "Đã cấp quyền Admin cho người dùng");
          await fetchUsers();
        } catch (err) {
          console.error("❌ Error promoting to admin:", err);
          error("Lỗi", "Không thể cấp quyền Admin");
        }
      }
    );
  };

  // giang cap quyen admin
  const demoteFromAdmin = async (user: User) => {
    confirm(
      "Thu hồi quyền Admin",
      `Thu hồi quyền Admin của ${
        user.fullName || user.email
      }?\n\nNgười dùng sẽ trở thành User thường và mất:\n- Quyền quản lý hệ thống\n- Truy cập admin panel\n- Quyền chỉnh sửa nội dung`,
      async () => {
        try {
          const userRef = doc(db, "users", user.id);

          await updateDoc(userRef, {
            role: "user",
            updatedAt: Timestamp.now(),
          });

          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.id === user.id ? { ...u, role: "user" } : u
            )
          );

          success("Thành công", "Đã thu hồi quyền Admin");
          await fetchUsers();
        } catch (err) {
          console.error("❌ Error demoting from admin:", err);
          error("Lỗi", "Không thể thu hồi quyền Admin");
        }
      }
    );
  };

  //
  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => openUserDetailModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Icon
                name="account-circle"
                size={40}
                color={COLORS.textSecondary}
              />
            </View>
          )}
          {/* BỎ statusIndicator */}
          {item.role === "admin" && (
            <View style={styles.adminBadge}>
              <Icon
                name="admin-panel-settings"
                size={12}
                color={COLORS.white}
              />
            </View>
          )}
        </View>

        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.fullName || "Chưa đặt tên"}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View
              style={[
                styles.roleTag,
                {
                  backgroundColor:
                    item.role === "admin" ? COLORS.error : COLORS.primary,
                },
              ]}
            >
              <Text style={[styles.roleText, { color: COLORS.white }]}>
                {item.role === "admin" ? "Admin" : "User"}
              </Text>
            </View>
            <Text style={styles.joinDate}>
              {item.createdAt?.toDate().toLocaleDateString("vi-VN")}
            </Text>
          </View>

          {/* Music Stats */}
          <View style={styles.musicStats}>
            <Text style={styles.statText}>
              ❤️ {item.totalLikedSongs || 0} bài hát yêu thích
              {item.phoneNumber && ` • 📱 ${item.phoneNumber}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            openEditModal(item);
          }}
        >
          <Icon name="edit" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* ADMIN ACTIONS */}
        {item.role === "user" ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              promoteToAdmin(item);
            }}
          >
            <Icon name="admin-panel-settings" size={20} color={COLORS.error} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              demoteFromAdmin(item);
            }}
          >
            <Icon name="remove-moderator" size={20} color={COLORS.error} />
          </TouchableOpacity>
        )}

        {/* Disable or hide the delete button for admin */}
        {item.role !== "admin" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteUserAccount(item);
            }}
          >
            <Icon name="delete" size={20} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  // render modal hien thi thong tin chi tiet cua nguoi dung
  const renderUserDetailModal = () => (
    <Modal
      visible={showUserDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowUserDetailModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowUserDetailModal(false)}>
            <Icon name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Chi tiết người dùng</Text>
          <TouchableOpacity
            onPress={() => {
              setShowUserDetailModal(false);
              if (selectedUser) openEditModal(selectedUser);
            }}
          >
            <Icon name="edit" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {selectedUser && (
          <ScrollView style={styles.modalContent}>
            {/* User Avatar & Basic Info */}
            <View style={styles.detailHeader}>
              <View style={styles.detailAvatar}>
                {selectedUser.photoURL ? (
                  <Image
                    source={{ uri: selectedUser.photoURL }}
                    style={styles.detailAvatarImage}
                  />
                ) : (
                  <Icon
                    name="account-circle"
                    size={80}
                    color={COLORS.textSecondary}
                  />
                )}
              </View>
              <Text style={styles.detailName}>
                {selectedUser.fullName || "Chưa đặt tên"}
              </Text>
              <Text style={styles.detailEmail}>{selectedUser.email}</Text>
              <View
                style={[
                  styles.detailRoleTag,
                  {
                    backgroundColor:
                      selectedUser.role === "admin"
                        ? COLORS.error
                        : COLORS.primary,
                  },
                ]}
              >
                <Text style={styles.detailRoleText}>
                  {selectedUser.role === "admin"
                    ? "Quản trị viên"
                    : "Người dùng"}
                </Text>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsCards}>
              <View style={styles.statCard}>
                <Icon name="favorite" size={24} color={COLORS.error} />
                <Text style={styles.statCardNumber}>
                  {selectedUser.totalLikedSongs || 0}
                </Text>
                <Text style={styles.statCardLabel}>Bài hát yêu thích</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="phone" size={24} color={COLORS.primary} />
                <Text style={styles.statCardNumber}>
                  {selectedUser.phoneNumber ? "Có" : "Chưa"}
                </Text>
                <Text style={styles.statCardLabel}>Số điện thoại</Text>
              </View>
              <View style={styles.statCard}>
                <Icon
                  name={
                    selectedUser.role === "admin"
                      ? "admin-panel-settings"
                      : "person"
                  }
                  size={24}
                  color={
                    selectedUser.role === "admin"
                      ? COLORS.error
                      : COLORS.primary
                  }
                />
                <Text style={styles.statCardNumber}>
                  {selectedUser.role === "admin" ? "Admin" : "User"}
                </Text>
                <Text style={styles.statCardLabel}>Vai trò</Text>
              </View>
            </View>

            {/* Detail Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Thông tin chi tiết</Text>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Tên đầy đủ:</Text>
                <Text style={styles.detailValue}>
                  {selectedUser.fullName || "Chưa cập nhật"}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Ngày tham gia:</Text>
                <Text style={styles.detailValue}>
                  {selectedUser.createdAt?.toDate().toLocaleDateString("vi-VN")}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Cập nhật lần cuối:</Text>
                <Text style={styles.detailValue}>
                  {selectedUser.updatedAt
                    ?.toDate()
                    .toLocaleDateString("vi-VN") || "Chưa có"}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Số điện thoại:</Text>
                <Text style={styles.detailValue}>
                  {selectedUser.phoneNumber || "Chưa cập nhật"}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Vai trò:</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        selectedUser.role === "admin"
                          ? COLORS.error
                          : COLORS.primary,
                    },
                  ]}
                >
                  {selectedUser.role === "admin"
                    ? "Quản trị viên"
                    : "Người dùng"}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Bài hát yêu thích:</Text>
                <Text style={styles.detailValue}>
                  {selectedUser.totalLikedSongs || 0} bài hát
                </Text>
              </View>

              {selectedUser.likedSongs &&
                selectedUser.likedSongs.length > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>
                      ID bài hát yêu thích:
                    </Text>
                    <Text style={styles.detailValue}>
                      {selectedUser.likedSongs.length > 3
                        ? `${selectedUser.likedSongs.slice(0, 3).join(", ")}...`
                        : selectedUser.likedSongs.join(", ")}
                    </Text>
                  </View>
                )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // render modal chỉnh sửa người dùng
  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowEditModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEditModal(false)}>
            <Icon name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Chỉnh sửa người dùng</Text>
          <TouchableOpacity onPress={updateUser} disabled={updating}>
            {updating ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.saveButton}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên đầy đủ</Text>
            <TextInput
              style={styles.textInput}
              value={editData.fullName}
              onChangeText={(text) =>
                setEditData((prev) => ({ ...prev, fullName: text }))
              }
              placeholder="Nhập tên đầy đủ"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.textInput, styles.disabledInput]}
              value={editData.email}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.textInput}
              value={editData.phoneNumber}
              onChangeText={(text) =>
                setEditData((prev) => ({ ...prev, phoneNumber: text }))
              }
              placeholder="Nhập số điện thoại"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vai trò</Text>
            <View style={styles.roleSelector}>
              {["user", "admin"].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    editData.role === role && styles.roleOptionActive,
                  ]}
                  onPress={() =>
                    setEditData((prev) => ({ ...prev, role: role as any }))
                  }
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      editData.role === role && styles.roleOptionTextActive,
                    ]}
                  >
                    {role === "user" ? "User" : "Admin"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // render header thống kê người dùng
  const renderStatsHeader = () => (
    <View style={styles.statsHeader}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{userStats.totalUsers}</Text>
        <Text style={styles.statLabel}>Tổng số</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>
          {users.filter((u) => u.role === "user").length}
        </Text>
        <Text style={styles.statLabel}>User</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{userStats.adminUsers}</Text>
        <Text style={styles.statLabel}>Admin</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{userStats.totalLikedSongs}</Text>
        <Text style={styles.statLabel}>Bài hát yêu thích</Text>
      </View>
    </View>
  );

  // render giao diện chính
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý người dùng</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Stats Header */}
      {renderStatsHeader()}

      {/* Search & Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo email hoặc tên..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterTabs}
        >
          {[
            { key: "all", label: "Tất cả" },
            { key: "user", label: "User" },
            { key: "admin", label: "Admin" },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                filterRole === filter.key && styles.filterTabActive,
              ]}
              onPress={() => setFilterRole(filter.key as any)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterRole === filter.key && styles.filterTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          Hiển thị {filteredUsers.length} / {users.length} người dùng
        </Text>
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Đang tải danh sách người dùng...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          style={styles.usersList}
          contentContainerStyle={styles.usersListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                Không tìm thấy người dùng nào
              </Text>
              <Text style={styles.emptySubtext}>
                Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modals */}
      {renderUserDetailModal()}
      {renderEditModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statsHeader: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filtersContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  filterTabs: {
    flexDirection: "row",
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.divider,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  // BỎ statusIndicator styles
  adminBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  joinDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  musicStats: {
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailHeader: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: 24,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.divider,
  },
  detailAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  detailName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  detailEmail: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  detailRoleTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailRoleText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  statsCards: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  statCard: {
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    minWidth: 80,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  statCardNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginVertical: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1.5,
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  disabledInput: {
    backgroundColor: COLORS.divider,
    color: COLORS.textSecondary,
  },
  roleSelector: {
    flexDirection: "row",
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
  },
  roleOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleOptionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  roleOptionTextActive: {
    color: COLORS.white,
    fontWeight: "bold",
  },
});
