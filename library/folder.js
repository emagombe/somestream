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
import MediaItem from "./media_item";
import PlayerBar from "../components/player_bar";

import { get_folder_content, update_media_state } from "../../classes/Media";

/* Components */
import BLButton from "../components/bl_button";
import BLIconButton from "../components/bl_icon_button";
import mmkv from "../../storage/mmkv";
import { to_hh_mm_ss } from "../../utils/TimeCaster";
import ImageLoader from "../components/image_loader";

import { read_external_storage_permission } from "../../utils/permissions";

const defaut_image = require("../../storage/img/default.png");

function Folder(props) {
	const { route, navigation } = props;

	const toast = useToast();

	const isDarkMode = useColorScheme() === "dark";
	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const media = useSelector(state => state.media);
	const player = useSelector(state => state.player);
	const [image, set_image] = useState(defaut_image);

	const {
		bucket_display_name = "",
		_id,
		folder_path = "",
	} = typeof route.params !== "undefined" ? route.params : {};

	const [edit_mode, set_edit_mode] = useState(false);
	const [selected_list, set_selected_list] = useState([]);

	const [media_files, set_media_files] = useState([]);
	const [column, set_column] = useState("folder");
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

	useEffect(() => {
		const run_async = async () => {
			update_media_state();
			on_order_change();
		};
		run_async();
	}, []);

	useEffect(() => {
		const run_async = async () => {
			try {
				if (typeof media.list !== "undefined") {
					const folder_content = get_folder_content(
						media.list,
						folder_path
					);
					update_list(folder_content);
				}
			} catch (ex) {
				console.log(ex);
			}
		};
		run_async();
	}, [media]);

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
		update_list();
	}, [column, order]);

	const on_order_change = () => {
		try {
			const folders_order = mmkv.getString("FOLDER_ORDER");
			if (typeof folders_order !== "undefined") {
				const data = JSON.parse(folders_order);
				const found = data.find(
					item => item.folder_path == folder_path
				);
				if (typeof found !== "undefined") {
					set_order(found.order);
					set_column(found.column);
				}
			}
		} catch (ex) {
			console.log(ex);
		}
	};

	const update_list = (_list = null) => {
		try {
			const _new_list = _list == null ? [...media_files] : [..._list];
			if (_new_list.length === 0) {
				return;
			}
			if (order === "ASC") {
				_new_list.sort((a, b) => {
					if (column === "title") {
						const nameA = a.title.toUpperCase();
						const nameB = b.title.toUpperCase();

						if (nameA < nameB) {
							return -1;
						}
						if (nameA > nameB) {
							return 1;
						}
						return 0;
					}
					if (column === "album") {
						const nameA = a.album.toUpperCase();
						const nameB = b.album.toUpperCase();

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
					if (column === "title") {
						const nameA = a.title.toUpperCase();
						const nameB = b.title.toUpperCase();

						if (nameA > nameB) {
							return -1;
						}
						if (nameA < nameB) {
							return 1;
						}
						return 0;
					}
					if (column === "album") {
						const nameA = a.album.toUpperCase();
						const nameB = b.album.toUpperCase();

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
			set_media_files(_new_list);
		} catch (ex) {
			console.log(ex);
		}
	};

	const onPressItem = (e, item) => {
		if (edit_mode) {
			if (selected_list.some(_item => _item == item._id)) {
				/* Remove */
				set_selected_list(
					selected_list.filter(_item => _item != item._id)
				);
			} else {
				/* Add */
				set_selected_list([...selected_list, item._id]);
			}
		} else {
			/* Do some other stuff */
			const index = media_files.findIndex(_item => _item._id == item._id);
			on_press_play_tracks(item, index);
		}
	};
	const onLongPressItem = (e, item) => {
		if (!edit_mode) {
			set_edit_mode(true);
		}
		if (selected_list.some(_item => _item == item._id)) {
			/* Remove */
			set_selected_list(selected_list.filter(_item => _item != item._id));
		} else {
			/* Add */
			set_selected_list([...selected_list, item._id]);
		}
	};
	const onCheckBoxChangeItem = (value, item) => {
		if (selected_list.some(_item => _item == item._id)) {
			/* Remove */
			set_selected_list(selected_list.filter(_item => _item != item._id));
		} else {
			/* Add */
			set_selected_list([...selected_list, item._id]);
		}
	};
	const onCheckBoxChangeItemAll = value => {
		if (selected_list.length < media_files.length) {
			/* Select all */
			set_selected_list(media_files.map(item => item._id));
		} else {
			/* Remove all */
			set_selected_list([]);
		}
	};

	const remove_selected = () => {
		const remove = async () => {
			try {
				for (const item of selected_list) {
					const found = media_files.find(_item => _item._id == item);
					if (typeof found !== "undefined") {
						const removed =
							await NativeModules.MediaScanner.delete_media(
								found._data
							);
					}
				}
				update_media_state();
				set_selected_list([]);
				set_edit_mode(false);
				toast.hideAll();
				toast.show("Selected files have been removed");
			} catch (ex) {
				console.log(ex);
			}
		};
		navigation.navigate("BLAlert", {
			onConfirmPress: remove,
			confirm_message: "Remove",
			message: "Remove selected music?",
		});
	};

	const on_press_play_tracks = async (item, index) => {
		try {
			const run_async = async () => {
				const media_list = media_files.map(item => ({
					id: String(item._id),
					local: true,
					title: String(item.title),
					artist: String(item.artist),
					uri: String(item._data),
					artwork_uri: String(""),
					duration: parseInt(item.duration),
				}));
				const data = {
					queue: media_list,
					current_id: item._id,
					index,
				};
				NativeModules.Player.set_media(JSON.stringify(data)).then(
					() => {
						NativeModules.Player.play();
						mmkv.set("PLAYER_QUEUE", JSON.stringify(media_files));
						/* Navigate to player */
						// navigation.navigate("Player");
					}
				);
			};
			run_async();
		} catch (ex) {
			console.log(ex);
		}
	};

	const add_to_playlist = async () => {
		try {
			const callback = (e, item) => {
				try {
					const json = JSON.parse(
						mmkv.getString("PLAYER_PLAYLIST_MUSIC")
					);
					const new_plm = [];
					for (const _item of selected_list) {
						new_plm.push({
							id:
								json.length > 0
									? json[json.length - 1].id + 1
									: 1,
							playlist: item.id,
							music: _item,
							date_added: new Date().getTime(),
						});
					}
					mmkv.set(
						"PLAYER_PLAYLIST_MUSIC",
						JSON.stringify([...json, ...new_plm])
					);
					toast.hideAll();
					toast.show("Added to playlist successfully");
					set_selected_list([]);
					set_edit_mode(false);
				} catch (ex) {
					console.log(ex);
				}
			};
			const data = {
				on_press: callback,
			};
			navigation.navigate("PlaylistMusicAdd", data);
		} catch (ex) {
			console.log(ex);
		}
	};

	const render_item = ({ item, index, separators }) => (
		<BLButton
			onPress={e => onPressItem(e, item)}
			onLongPress={e => onLongPressItem(e, item)}
			style={{
				borderRadius: 10,
				marginLeft: 5,
				marginRight: 5,
				elevation: 0,
			}}
			color="rgba(0, 0, 0, 0)"
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
						value={selected_list.some(_item => _item == item._id)}
						onValueChange={e => onCheckBoxChangeItem(e, item)}
						style={{}}
					/>
				) : null}
				<View>
					<ImageLoader
						item={item}
						style={{
							width: 60,
							height: 60,
							marginRight: 10,
							borderRadius: 10,
						}}
					/>
				</View>
				<View
					style={{
						flexDirection: "column",
						alignItems: "flex-start",
						justifyContent: "center",
						flexWrap: "nowrap",
						flexShrink: 1,
					}}
				>
					<Text
						style={{
							color: theme.font.secodary,
							fontWeight: "bold",
							fontSize: 13,
						}}
					>
						{item.title.length > 50
							? `${item.title.substring(0, 50)}...`
							: item.title}
					</Text>
					<Text
						style={{
							color: theme.font.secodary,
							fontWeight: "normal",
							fontSize: 11,
							flexWrap: "wrap",
							flexShrink: 1,
						}}
					>
						{item.artist.length > 25
							? `${item.artist.substring(0, 25)}...`
							: item.artist}
					</Text>
					<Text
						style={{
							color: theme.font.secodary,
							fontWeight: "normal",
							fontSize: 11,
							flexWrap: "wrap",
							flexShrink: 1,
						}}
					>
						{to_hh_mm_ss(item.duration)}
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
							onPress={add_to_playlist}
							disabled={selected_list.length == 0}
							style={{}}
						>
							<MCIcon
								name="plus"
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
									screen_name: "folder",
									folder_path,
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
								navigation.navigate("FolderOrder", {
									callback: on_order_change,
									folder_path,
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
						onPress={e => navigation.goBack()}
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
							All folders
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
						{bucket_display_name} ({media_files.length})
					</Text>
				</View>
				<View
					style={{
						flex: 1,
						marginTop: 10,
						borderTopLeftRadius: 20,
						borderTopRightRadius: 20,
						backgroundColor: "rgba(0, 0, 0, 0.45)",
						paddingTop: 10,
						paddingTop: edit_mode ? 32 : 10,
					}}
				>
					{edit_mode ? (
						<CheckBox
							tintColors={{
								true: theme.font.secodary,
								false: theme.font.secodary,
							}}
							value={selected_list.length == media_files.length}
							onValueChange={onCheckBoxChangeItemAll}
							style={{
								position: "absolute",
								top: 0,
								left: 15,
							}}
						/>
					) : null}
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
							{selected_list.length}/{media_files.length}
						</Text>
					) : null}
					<FlatList
						showsHorizontalScrollIndicator={false}
						showsVerticalScrollIndicator={false}
						horizontal={false}
						keyExtractor={(item, index) => `${item._id}_${index}`}
						data={media_files}
						renderItem={render_item}
						windowSize={10}
						initialNumToRender={10}
						overScrollMode="always"
						style={{}}
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
			</View>
		</View>
	);
}
export default Folder;
