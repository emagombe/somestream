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
	TextInput,
} from "react-native";

import { Provider, useSelector, useDispatch, batch } from "react-redux";

/* Icons */
import ADIcon from "react-native-vector-icons/AntDesign";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import FAIcon from "react-native-vector-icons/FontAwesome";
import SLIcon from "react-native-vector-icons/SimpleLineIcons";

import theme from "../../theme/theme";

/* Components */
import BLButton from "../components/bl_button";
import BLIconButton from "../components/bl_icon_button";
import PlayerBar from "../components/player_bar";
import { to_hh_mm_ss } from "../../utils/TimeCaster";
import ImageLoader from "../components/image_loader";

/* Classes */
import {
	get_folders,
	get_folder_content,
	update_media_state,
} from "../../classes/Media";

import { read_external_storage_permission } from "../../utils/permissions";
import mmkv from "../../storage/mmkv";

const defaut_image = require("../../storage/img/default.png");

const order_timeout = null;

function Search(props) {
	const { route, navigation } = props;

	const { screen_name, folder_path, playlist_info } = route.params;

	const media = useSelector(state => state.media);
	const player = useSelector(state => state.player);
	const playlist = useSelector(state => state.playlist);

	const [image, set_image] = useState(defaut_image);
	const [search_query, set_search_query] = useState("");

	const isDarkMode = useColorScheme() === "dark";
	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const [folders, set_folders] = useState([]);
	const [media_files, set_media_files] = useState([]);
	const [playlist_music_list, set_playlist_music_list] = useState([]);

	const [column, set_column] = useState("folder_name");
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
		update_image();
	}, [player.id]);

	useEffect(() => {
		const run_async = async () => {
			try {
				if (typeof media.list !== "undefined") {
					const folders = get_folders(media.list);
					set_folders(folders);
				}
			} catch (ex) {
				console.log(ex);
			}
		};
		run_async();
	}, [media.list]);

	/* Folder content */
	useEffect(() => {
		const run_async = async () => {
			try {
				if (typeof media.list !== "undefined") {
					const folder_content = get_folder_content(
						media.list,
						folder_path
					);
					set_media_files(folder_content);
				}
			} catch (ex) {
				console.log(ex);
			}
		};
		run_async();
	}, [media.list]);

	useEffect(() => {
		update_playlist_music();
	}, []);

	const update_playlist_music = () => {
		try {
			const json = JSON.parse(mmkv.getString("PLAYER_PLAYLIST_MUSIC"));
			const plm = [];
			for (const item of json) {
				if (item.playlist == playlist_info.id) {
					const music = media.list.find(
						_item => _item._id == item.music
					);
					if (typeof music !== "undefined") {
						plm.push(music);
					}
				}
			}
			set_playlist_music_list(plm);
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_press_play_tracks_playlist_music = async (item, index) => {
		try {
			const run_async = async () => {
				const media_list = playlist_music_list.map(item => ({
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
						mmkv.set(
							"PLAYER_QUEUE",
							JSON.stringify(playlist_music_list)
						);
						/* Navigate to player */
						// navigation.navigate("Player");
						navigation.goBack();
					}
				);
			};
			run_async();
		} catch (ex) {
			console.log(ex);
		}
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
						navigation.goBack();
					}
				);
			};
			run_async();
		} catch (ex) {
			console.log(ex);
		}
	};

	const onPressItem = (e, item) => {
		const index = media_files.findIndex(_item => _item._id == item._id);
		on_press_play_tracks(item, index);
	};
	const onPressPlaylist = (e, item) => {
		const index = playlist_music_list.findIndex(
			_item => _item._id == item._id
		);
		on_press_play_tracks_playlist_music(item, index);
	};

	const run_search = () => {
		const data = [];
		if (screen_name == "folders") {
			return String(search_query).trim().length == 0
				? []
				: folders.filter(item =>
						item.bucket_display_name
							.toLowerCase()
							.includes(search_query.toLowerCase())
				  );
		}
		if (screen_name == "folder") {
			return String(search_query).trim().length == 0
				? []
				: media_files.filter(item =>
						String(`${item.title} - ${item.artist}`)
							.toLowerCase()
							.includes(search_query.toLowerCase())
				  );
		}
		if (screen_name == "playlist") {
			return String(search_query).trim().length == 0
				? []
				: playlist.list.filter(item =>
						item.name
							.toLowerCase()
							.includes(search_query.toLowerCase())
				  );
		}
		if (screen_name == "playlist_music") {
			return String(search_query).trim().length == 0
				? []
				: playlist_music_list.filter(item =>
						String(`${item.title} - ${item.artist}`)
							.toLowerCase()
							.includes(search_query.toLowerCase())
				  );
		}
		return data;
	};

	const on_search_text_change = text => {
		try {
			set_search_query(text);
		} catch (ex) {
			console.log(ex);
		}
	};

	const render = data => {
		if (screen_name == "folders") {
			return render_item_folders(data);
		}
		if (screen_name == "folder") {
			return render_item_folder(data);
		}
		if (screen_name == "playlist") {
			return render_item_playlist(data);
		}
		if (screen_name == "playlist_music") {
			return render_item_playlist_music(data);
		}
		return <></>;
	};

	const render_item_folders = ({ item, index, separators }) => (
		<BLButton
			onPress={() => {
				navigation.navigate("Folder", {
					bucket_display_name: item.bucket_display_name,
					_id: item._id,
					folder_path: item.folder_path,
				});
			}}
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
				<MCIcon
					name="folder"
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
						{item.bucket_display_name}
					</Text>
					<Text
						style={{
							color: theme.font.secodary,
							fontWeight: "normal",
							fontSize: 11,
						}}
					>
						{item.folder_path.length > 50
							? `${item.folder_path.substring(0, 50)}...`
							: item.folder_path}
					</Text>
				</View>
			</View>
		</BLButton>
	);

	const render_item_folder = ({ item, index, separators }) => (
		<BLButton
			onPress={e => onPressItem(e, item)}
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

	const render_item_playlist = ({ item, index, separators }) => (
		<BLButton
			onPress={e => {
				navigation.navigate("PlaylistMusic", {
					playlist_info: item,
				});
			}}
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

	const render_item_playlist_music = ({
		item,
		index,
		drag,
		isActive,
		separators,
	}) => (
		<BLButton
			onPress={e => onPressPlaylist(e, item)}
			style={{
				borderRadius: 10,
				marginLeft: 5,
				marginRight: 5,
				elevation: 0,
				opacity: isActive ? 0.5 : 1,
			}}
			color="rgba(0, 0, 0, 0)"
			view_style={{
				flexDirection: "row",
				justifyContent: "space-between",
				alignItems: "center",
				width: "100%",
			}}
		>
			<View
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "flex-start",
				}}
			>
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
			<View
				style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "center",
					alignItems: "center",
					padding: 5,
					position: "absolute",
					right: 0,
				}}
			/>
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
					flex: 1,
					height: "100%",
				}}
				resizeMode="cover"
				blurRadius={100}
			/>
			<View
				style={{
					flex: 1,
					backgroundColor: theme.background.main,
					opacity: 0.4,
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
				<View
					style={{
						position: "absolute",
						marginTop: 40,
						right: 10,
						left: 10,
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
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
						Search
					</Text>
					<BLIconButton
						onPress={e => navigation.goBack()}
						size={20}
					>
						<MCIcon
							name="close"
							size={20}
							color={theme.font.secodary}
						/>
					</BLIconButton>
				</View>
				<View
					style={{
						marginTop: 60,
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "flex-end",
						padding: 10,
					}}
				>
					<TextInput
						placeholder="Search..."
						placeholderTextColor={theme.font.secodary}
						value={search_query}
						onChangeText={on_search_text_change}
						style={{
							width: "100%",
							backgroundColor: theme.background.content.main,
							padding: 10,
							borderRadius: 20,
							marginTop: 10,
							fontWeight: "bold",
							color: theme.font.secodary,
						}}
					/>
				</View>
				<View
					style={{
						flex: 1,
						marginTop: 0,
						borderTopLeftRadius: 20,
						borderTopRightRadius: 20,
						backgroundColor: "rgba(0, 0, 0, 0.45)",
						paddingTop: 10,
					}}
				>
					<FlatList
						showsHorizontalScrollIndicator={false}
						showsVerticalScrollIndicator={false}
						horizontal={false}
						keyExtractor={(item, index) => item._id}
						data={run_search()}
						renderItem={render}
						windowSize={5}
						initialNumToRender={10}
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
			</View>
		</View>
	);
}
export default Search;
