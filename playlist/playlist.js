/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import {
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	NativeModules,
	Dimensions,
	FlatList,
	Image,
	BackHandler,
} from "react-native";

import { Provider, useSelector, useDispatch, batch } from "react-redux";
import CheckBox from "@react-native-community/checkbox";
import { useToast } from "react-native-toast-notifications";

/* Icons */
import ADIcon from "react-native-vector-icons/AntDesign";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import FAIcon from "react-native-vector-icons/FontAwesome";
import SLIcon from "react-native-vector-icons/SimpleLineIcons";

import theme from "../../theme/theme";
import mmkv from "../../storage/mmkv";

/* Components */
import BLButton from "../components/bl_button";
import BLIconButton from "../components/bl_icon_button";
import PlayerBar from "../components/player_bar";

/* Classes */
import { get_folders, update_media_state } from "../../classes/Media";

import { read_external_storage_permission } from "../../utils/permissions";
import { update_playlist } from "../../storage/state/playlist/playlist";

const defaut_image = require("../../storage/img/default.png");

function Playlist(props) {
	const { route, navigation } = props;

	const toast = useToast();
	const dispatch = useDispatch();
	const media = useSelector(state => state.media);
	const player = useSelector(state => state.player);
	const playlist = useSelector(state => state.playlist);
	const [image, set_image] = useState(defaut_image);

	const isDarkMode = useColorScheme() === "dark";
	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const [edit_mode, set_edit_mode] = useState(false);
	const [selected_list, set_selected_list] = useState([]);

	const [folders, set_folders] = useState([]);

	const [column, set_column] = useState("name");
	const [order, set_order] = useState("ASC");

	const update_image = async () => {
		const queue = JSON.parse(mmkv.getString("PLAYER_QUEUE"));
		const found = queue.find(item => item._id == player.id);
		if (typeof found !== "undefined") {
			const img = await NativeModules.MediaScanner.get_media_img(
				found._data,
				found._id
			);
			if (img != null) {
				set_image({ uri: `file://${img}` });
			} else {
				set_image(defaut_image);
			}
		}
	};

	const on_order_change = () => {
		try {
			const playlist_order = mmkv.getString("PLAYER_PLAYLIST_ORDER");
			if (typeof playlist_order !== "undefined") {
				const data = JSON.parse(playlist_order);
				set_order(data.order);
				set_column(data.column);
			}
		} catch (ex) {
			console.log(ex);
		}
	};

	const update_list = (_list = null) => {
		try {
			const _new_list = _list == null ? [...playlist.list] : [..._list];
			if (_new_list.length === 0) {
				return;
			}
			if (order === "ASC") {
				_new_list.sort((a, b) => {
					if (column === "name") {
						const nameA = a.name.toUpperCase();
						const nameB = b.name.toUpperCase();

						if (nameA < nameB) {
							return -1;
						}
						if (nameA > nameB) {
							return 1;
						}
						return 0;
					}
					if (column === "date_added") {
						const dateA = new Date(a.date_added);
						const dateB = new Date(b.date_added);
						if (dateA < dateB) {
							return -1;
						}
						if (dateA > dateB) {
							return 1;
						}
						return 0;
					}
				});
			} else {
				_new_list.sort((a, b) => {
					if (column === "name") {
						const nameA = a.name.toUpperCase();
						const nameB = b.name.toUpperCase();

						if (nameA > nameB) {
							return -1;
						}
						if (nameA < nameB) {
							return 1;
						}
						return 0;
					}
					if (column === "date_added") {
						const dateA = new Date(a.date_added);
						const dateB = new Date(b.date_added);
						if (dateA > dateB) {
							return -1;
						}
						if (dateA < dateB) {
							return 1;
						}
						return 0;
					}
				});
			}
			dispatch(
				update_playlist({
					list: _new_list,
				})
			);
		} catch (ex) {
			console.log(ex);
		}
	};

	useEffect(() => {
		update_list();
	}, [column, order]);

	useEffect(() => {
		const run_async = async () => {
			update_media_state();
			on_order_change();
		};
		run_async();
	}, []);

	useEffect(() => {
		const subscribe = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				if (edit_mode) {
					set_edit_mode(false);
					set_selected_list([]);
					return true;
				}
				return false;
			}
		);
		return () => {
			subscribe.remove();
		};
	}, [edit_mode]);

	useEffect(() => {
		update_image();
	}, [player.id]);

	useEffect(() => {
		const run_async = async () => {
			try {
			} catch (ex) {
				console.log(ex);
			}
		};
		run_async();
	}, []);

	const onPressPlaylist = (e, item) => {
		if (edit_mode) {
			if (selected_list.some(_item => _item == item.id)) {
				/* Remove */
				set_selected_list(
					selected_list.filter(_item => _item != item.id)
				);
			} else {
				/* Add */
				set_selected_list([...selected_list, item.id]);
			}
		} else {
			/* Do some other stuff */
			navigation.navigate("PlaylistMusic", {
				playlist_info: item,
			});
		}
	};
	const onLongPressPlaylist = (e, item) => {
		if (!edit_mode) {
			set_edit_mode(true);
		}
		if (selected_list.some(_item => _item == item.id)) {
			/* Remove */
			set_selected_list(selected_list.filter(_item => _item != item.id));
		} else {
			/* Add */
			set_selected_list([...selected_list, item.id]);
		}
	};
	const onCheckBoxChangePlaylist = (value, item) => {
		if (selected_list.some(_item => _item == item.id)) {
			/* Remove */
			set_selected_list(selected_list.filter(_item => _item != item.id));
		} else {
			/* Add */
			set_selected_list([...selected_list, item.id]);
		}
	};
	const onCheckBoxChangePlaylistAll = value => {
		if (selected_list.length < playlist.list.length) {
			/* Select all */
			set_selected_list(playlist.list.map(item => item.id));
		} else {
			/* Remove all */
			set_selected_list([]);
		}
	};

	const remove_selected = () => {
		const remove = () => {
			dispatch(
				update_playlist({
					list: playlist.list.filter(
						item => !selected_list.some(_item => item.id == _item)
					),
				})
			);
			const new_list = JSON.parse(
				mmkv.getString("PLAYER_PLAYLIST_MUSIC")
			).filter(item => {
				if (selected_list.some(_item => item.playlist == _item)) {
					return false;
				}
				return true;
			});
			mmkv.set("PLAYER_PLAYLIST_MUSIC", JSON.stringify(new_list));
			set_edit_mode(false);
			set_selected_list([]);
			toast.hideAll();
			toast.show("Removed successfully");
		};
		navigation.navigate("BLAlert", {
			onConfirmPress: remove,
			confirm_message: "Remove",
			message: "Remove selected playlists?",
		});
	};

	const rename_selected = () => {
		navigation.navigate(
			"PlaylistAdd",
			playlist.list.find(item => item.id == selected_list[0])
		);
		set_edit_mode(false);
		set_selected_list([]);
	};

	const render_item = ({ item, index, separators }) => (
		<BLButton
			onPress={e => onPressPlaylist(e, item)}
			onLongPress={e => onLongPressPlaylist(e, item)}
			style={{
				borderRadius: 10,
				marginLeft: 5,
				marginRight: 5,
				elevation: 0,
			}}
			color="rgba(0, 0, 0, 0)"
			view_style={{
				padding: 5,
			}}
		>
			<View
				style={{
					width: "100%",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "flex-start",
				}}
			>
				{edit_mode ? (
					<CheckBox
						tintColors={{
							true: theme.font.secodary,
							false: theme.font.secodary,
						}}
						value={selected_list.some(_item => _item == item.id)}
						onValueChange={e => onCheckBoxChangePlaylist(e, item)}
						style={{}}
					/>
				) : null}
				<MCIcon
					name="music-box"
					size={60}
					color={theme.font.secodary}
					style={{
						marginRight: 10,
						opacity: 0.6,
					}}
				/>
				<View
					style={{
						flexShrink: 1,
					}}
				>
					<Text
						style={{
							color: theme.font.secodary,
							fontWeight: "bold",
							fontSize: 13,
						}}
						nativeID={`bucket_display_name_${item._id}`}
					>
						{item.name.length > 50
							? `${item.name.substring(0, 50)}...`
							: item.name}
					</Text>
				</View>
			</View>
		</BLButton>
	);

	return (
		<View
			style={{
				flex: 1,
			}}
		>
			<Image
				source={image}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					opacity: 1,
					height: "100%",
				}}
				resizeMode="cover"
				blurRadius={100}
			/>
			<View
				style={{
					flex: 1,
					backgroundColor: theme.background.main,
					opacity: 0.45,
					position: "absolute",
					top: 0,
					bottom: 0,
					right: 0,
					left: 0,
				}}
			/>
			<View
				style={{
					flex: 1,
				}}
			>
				{edit_mode ? (
					<View
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-end",
							position: "absolute",
							top: 40,
							left: 5,
							right: 5,
							zIndex: 500,
						}}
						pointerEvents="box-none"
					>
						<BLIconButton
							size={20}
							onPress={rename_selected}
							disabled={selected_list.length != 1}
							style={{}}
						>
							<MCIcon
								name="square-edit-outline"
								size={20}
								color={theme.font.secodary}
							/>
						</BLIconButton>
						<BLIconButton
							size={20}
							onPress={remove_selected}
							disabled={selected_list.length == 0}
							style={{}}
						>
							<MCIcon
								name="delete"
								size={20}
								color={theme.font.secodary}
							/>
						</BLIconButton>
					</View>
				) : (
					<View
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-end",
							position: "absolute",
							top: 40,
							left: 5,
							right: 5,
							zIndex: 500,
						}}
						pointerEvents="box-none"
					>
						<BLIconButton
							size={20}
							onPress={() => {
								navigation.navigate("Search", {
									screen_name: "playlist",
								});
							}}
							disabled={false}
							style={{}}
						>
							<ADIcon
								name="search1"
								size={20}
								color={theme.font.secodary}
							/>
						</BLIconButton>
						<BLIconButton
							size={20}
							onPress={() => {
								navigation.navigate("PlaylistOrder", {
									callback: on_order_change,
								});
							}}
							disabled={false}
							style={{
								flexDirection: "row",
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<MCIcon
								name="sort"
								size={20}
								color={theme.font.secodary}
							/>
						</BLIconButton>
					</View>
				)}
				<View
					style={{
						marginTop: 40,
					}}
				>
					<BLButton
						style={{
							padding: 0,
							marginLeft: 5,
							marginBottom: 5,
							borderRadius: 10,
							backgroundColor: theme.background.content.main,
						}}
						view_style={{
							padding: 0,
						}}
						onPress={e => navigation.replace("Library")}
					>
						<Text
							style={{
								color: theme.font.secodary,
								fontWeight: "bold",
								fontSize: 16,
								flexWrap: "wrap",
								flexShrink: 1,
								textAlign: "center",
								borderRadius: 10,
								alignSelf: "flex-start",
								padding: 5,
								paddingRight: 10,
								paddingLeft: 10,
								zIndex: 2,
							}}
						>
							<MCIcon
								name="arrow-left-bottom"
								size={20}
								color={theme.font.secodary}
							/>{" "}
							Library
						</Text>
					</BLButton>
					<Text
						style={{
							color: theme.font.secodary,
							fontWeight: "bold",
							fontSize: 16,
							flexWrap: "wrap",
							flexShrink: 1,
							backgroundColor: theme.background.content.main,
							textAlign: "center",
							borderRadius: 10,
							elevation: 10,
							alignSelf: "flex-start",
							marginLeft: 5,
							padding: 5,
							paddingRight: 10,
							paddingLeft: 10,
							zIndex: 2,
						}}
					>
						Playlists ({playlist.list.length})
					</Text>
				</View>
				<View
					style={{
						flex: 1,
						marginTop: 10,
						borderTopLeftRadius: 20,
						borderTopRightRadius: 20,
						backgroundColor: "rgba(0, 0, 0, 0.45)",
						paddingTop: edit_mode ? 32 : 10,
					}}
				>
					{edit_mode ? (
						<Text
							style={{
								backgroundColor: theme.background.content.main,
								padding: 5,
								paddingRight: 10,
								paddingLeft: 10,
								borderRadius: 10,
								position: "absolute",
								right: 5,
								top: -10,
								fontWeight: "bold",
								fontSize: 12,
								color: theme.font.secodary,
							}}
						>
							{selected_list.length}/{playlist.list.length}
						</Text>
					) : null}
					{edit_mode ? (
						<CheckBox
							tintColors={{
								true: theme.font.secodary,
								false: theme.font.secodary,
							}}
							value={selected_list.length == playlist.list.length}
							onValueChange={onCheckBoxChangePlaylistAll}
							style={{
								position: "absolute",
								top: 0,
								left: 10,
							}}
						/>
					) : null}
					<FlatList
						showsHorizontalScrollIndicator={false}
						showsVerticalScrollIndicator={false}
						horizontal={false}
						keyExtractor={(item, index) => item.id}
						data={playlist.list}
						renderItem={render_item}
						overScrollMode="always"
						contentContainerStyle={{
							paddingBottom: windowHeight / 5,
							paddingTop: 10,
							paddingRight: 5,
							justifyContent: "flex-start",
							alignItems: "center",
							borderTopLeftRadius: 20,
							borderTopRightRadius: 20,
						}}
					/>
				</View>
				{!edit_mode ? (
					<BLIconButton
						size={40}
						style={{
							position: "absolute",
							right: 5,
							bottom: 100,
						}}
						onPress={() => navigation.navigate("PlaylistAdd")}
					>
						<MCIcon
							name="plus"
							size={40}
							color={theme.font.secodary}
						/>
					</BLIconButton>
				) : null}
			</View>
		</View>
	);
}
export default Playlist;
