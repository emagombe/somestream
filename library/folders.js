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

/* Classes */
import { get_folders, update_media_state } from "../../classes/Media";

import { read_external_storage_permission } from "../../utils/permissions";
import mmkv from "../../storage/mmkv";

const defaut_image = require("../../storage/img/default.png");

const order_timeout = null;

function Folders(props) {
	const { route, navigation } = props;
	const media = useSelector(state => state.media);
	const player = useSelector(state => state.player);
	const [image, set_image] = useState(defaut_image);

	const isDarkMode = useColorScheme() === "dark";
	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const [folders, set_folders] = useState([]);

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

	const on_order_change = () => {
		try {
			const folders_order = mmkv.getString("FOLDERS_ORDER");
			if (typeof folders_order !== "undefined") {
				const data = JSON.parse(folders_order);
				set_order(data.order);
				set_column(data.column);
			}
		} catch (ex) {
			console.log(ex);
		}
	};

	const update_list = (_list = null) => {
		try {
			const _folders = _list == null ? [...folders] : [..._list];
			if (_folders.length === 0) {
				return;
			}
			if (order === "ASC") {
				_folders.sort((a, b) => {
					if (column === "folder_name") {
						const nameA = a.bucket_display_name.toUpperCase();
						const nameB = b.bucket_display_name.toUpperCase();

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
				_folders.sort((a, b) => {
					if (column === "folder_name") {
						const nameA = a.bucket_display_name.toUpperCase();
						const nameB = b.bucket_display_name.toUpperCase();

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
			set_folders(_folders);
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
		update_image();
	}, [player.id]);

	useEffect(() => {
		const run_async = async () => {
			try {
				if (typeof media.list !== "undefined") {
					const folders = get_folders(media.list);
					update_list(folders);
				}
			} catch (ex) {
				console.log(ex);
			}
		};
		run_async();
	}, [media]);

	const render_item = ({ item, index, separators }) => (
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
				<View
					style={{
						marginTop: 40,
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "flex-start",
					}}
				>
					<View>
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
							All folders ({folders.length})
						</Text>
					</View>
					<View
						style={{
							marginRight: 5,
							flexDirection: "row",
							justifyContent: "flex-start",
							alignItems: "center",
						}}
					>
						<BLIconButton
							size={20}
							onPress={() => {
								navigation.navigate("Search", {
									screen_name: "folders",
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
								navigation.navigate("FoldersOrder", {
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
				</View>
				<View
					style={{
						flex: 1,
						marginTop: 10,
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
						data={folders}
						renderItem={render_item}
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
export default Folders;
