/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from "react";
import {
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	Dimensions,
	ActivityIndicator,
	Pressable,
	NativeModules,
	Image,
} from "react-native";
// import { Navigation } from 'react-native-navigation';

import { Provider, useSelector, useDispatch, batch } from "react-redux";
import { CommonActions } from "@react-navigation/native";

/* Icons */
import ADIcon from "react-native-vector-icons/AntDesign";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import MIcon from "react-native-vector-icons/MaterialIcons";
import FAIcon from "react-native-vector-icons/FontAwesome";
import SLIcon from "react-native-vector-icons/SimpleLineIcons";

import mmkv from "../../storage/mmkv";

/* Components */
import BLButton from "../components/bl_button";
import BLIconButton from "../components/bl_icon_button";

/* Classes */
import { get_folders, update_media_state } from "../../classes/Media";

import theme from "../../theme/theme";

const defaut_image = require("../../storage/img/default.png");

function Library(props) {
	const { route, navigation } = props;

	const media = useSelector(state => state.media);
	const player = useSelector(state => state.player);
	const playlist = useSelector(state => state.playlist);
	const [image, set_image] = useState(defaut_image);

	const [media_loading, set_media_loading] = useState(false);
	const [folders_count, set_folders_count] = useState(0);
	const [playlist_count, set_playlist_count] = useState(0);
	const [albums_count, set_albums_count] = useState(0);

	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const isDarkMode = useColorScheme() === "dark";

	const top_icon_button_size = 17;

	const update_image = async () => {
		try {
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
		} catch (ex) {
			console.log(ex);
		}
	};

	useEffect(() => {
		const unsubscribeFocus = navigation.addListener("focus", () => {
			// Screen gained focus, perform tasks
		});

		const unsubscribeBlur = navigation.addListener("blur", () => {
			// Screen lost focus, perform cleanup tasks
		});

		return () => {
			unsubscribeFocus();
			unsubscribeBlur();
		};
	}, [navigation]);

	useEffect(() => {
		const run_async = async () => {
			refresh_media_files();
			update_image();
		};
		run_async();
	}, []);

	useEffect(() => {
		update_image();
	}, [player.id]);

	useEffect(() => {
		const run_async = async () => {
			try {
				if (typeof media.list !== "undefined") {
					const folders = get_folders(media.list);
					set_folders_count(folders.length);
				}
			} catch (ex) {
				console.log(ex);
			}
		};
		run_async();
	}, [media]);

	const refresh_media_files = async () => {
		try {
			set_media_loading(true);
			update_media_state();
			set_media_loading(false);
		} catch (ex) {
			console.log(ex);
			set_media_loading(false);
		}
	};

	const on_press_refresh = () => {
		try {
			refresh_media_files();
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_press_all_folders = () => {
		navigation.navigate("TabNav", {
			screen: "Folders",
		});
	};
	const on_press_playlists = () => {
		navigation.navigate("TabNav", {
			screen: "Playlist",
		});
	};

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
					marginTop: 50,
					padding: 5,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					zIndex: 2,
				}}
			>
				<View>
					<Text
						style={{
							fontSize: 30,
							fontWeight: "bold",
							color: theme.font.secodary,
						}}
					>
						Library
					</Text>
				</View>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "flex-end",
					}}
				>
					<BLIconButton
						size={top_icon_button_size}
						onPress={on_press_refresh}
						disabled={media_loading}
						style={{
							opacity: 0.7,
						}}
					>
						{media_loading ? (
							<ActivityIndicator
								size="small"
								color={theme.font.secodary}
							/>
						) : (
							<MCIcon
								name="refresh"
								size={top_icon_button_size}
								color={theme.font.secodary}
							/>
						)}
					</BLIconButton>
					<BLIconButton
						size={top_icon_button_size}
						style={{
							opacity: 0.7,
						}}
					>
						<MIcon
							name="settings"
							size={top_icon_button_size}
							color={theme.font.secodary}
						/>
					</BLIconButton>
				</View>
			</View>
			<View
				style={{
					height: "100%",
				}}
			>
				<View style={styles.library_container}>
					<BLButton
						style={{ ...styles.library_container_item }}
						color="transparent"
						onPress={on_press_all_folders}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "space-between",
								width: "100%",
							}}
						>
							<View
								style={{
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "flex-start",
								}}
							>
								<MCIcon
									name="folder"
									size={35}
									color={theme.primary}
									style={{
										marginRight: 10,
										opacity: 0.6,
									}}
								/>
								<Text
									style={styles.library_container_item_text}
								>
									All folders
								</Text>
							</View>
							<Text
								style={{
									color: theme.font.secodary,
									fontSize: 14,
									fontWeight: "bold",
								}}
							>
								{folders_count}
							</Text>
						</View>
					</BLButton>
					<BLButton
						style={{ ...styles.library_container_item }}
						color="transparent"
						onPress={on_press_playlists}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "space-between",
								width: "100%",
							}}
						>
							<View
								style={{
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "flex-start",
								}}
							>
								<MCIcon
									name="playlist-music-outline"
									size={35}
									color={theme.font.secodary}
									style={{
										marginRight: 10,
									}}
								/>
								<Text
									style={styles.library_container_item_text}
								>
									Playlists
								</Text>
							</View>
							<Text
								style={{
									color: theme.font.secodary,
									fontSize: 14,
									fontWeight: "bold",
								}}
							>
								{playlist.list.length}
							</Text>
						</View>
					</BLButton>
					<BLButton
						style={{ ...styles.library_container_item }}
						color="transparent"
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "space-between",
								width: "100%",
							}}
						>
							<View
								style={{
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "flex-start",
								}}
							>
								<MCIcon
									name="album"
									size={35}
									color={theme.primary}
									style={{
										marginRight: 10,
										opacity: 0.6,
									}}
								/>
								<Text
									style={styles.library_container_item_text}
								>
									Albums
								</Text>
							</View>
							<Text
								style={{
									color: theme.font.secodary,
									fontSize: 14,
									fontWeight: "bold",
								}}
							>
								{albums_count}
							</Text>
						</View>
					</BLButton>
				</View>
			</View>
		</View>
	);
}
export default Library;

const styles = StyleSheet.create({
	library_title_container: {
		margin: 10,
		marginTop: 70,
	},
	title: {
		fontSize: 30,
		fontWeight: "bold",
		color: theme.font.secodary,
	},
	library_container: {
		marginTop: 30,
	},
	library_container_item: {
		margin: 10,
		marginTop: 1,
		marginBottom: 1,
		elevation: 0,
	},
	library_container_item_text: {
		fontSize: 14,
		fontWeight: "bold",
		color: theme.font.secodary,
	},
});
