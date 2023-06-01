/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState, Fragment, useRef } from "react";
import type { PropsWithChildren } from "react";
import {
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	Pressable,
	TouchableWithoutFeedback,
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
import MIcon from "react-native-vector-icons/MaterialIcons";

import MarqueeText from "react-native-marquee";
import { useToast } from "react-native-toast-notifications";

/* Components */
import BLButton from "../components/bl_button";
import BLIconButton from "../components/bl_icon_button";

import theme from "../../theme/theme";

import { to_hh_mm_ss } from "../../utils/TimeCaster";

import mmkv from "../../storage/mmkv";

import { update_playlist } from "../../storage/state/playlist/playlist";

const defaut_image = require("../../storage/img/default.png");

function PlaylistAdd(props) {
	const { route, navigation } = props;

	const dispatch = useDispatch();
	const player = useSelector(state => state.player);
	const playlist = useSelector(state => state.playlist);
	const media = useSelector(state => state.media);

	const toast = useToast();

	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const [image, set_image] = useState(defaut_image);
	const [message, set_message] = useState("");

	const [name, set_name] = useState("");

	useEffect(() => {
		if (typeof route.params !== "undefined") {
			set_name(route.params.name);
		}
	}, []);

	const is_create = () => {
		if (typeof route.params !== "undefined") {
			if (typeof route.params.id !== "undefined") {
				return false;
			}
			return true;
		}
		return true;
	};

	const on_name_change = text => {
		set_name(text);
	};
	const on_cancel_press = () => {
		set_name("");
		navigation.goBack();
	};
	const on_create_press = e => {
		try {
			if (String(name).trim() == "") {
				toast.hideAll();
				toast.show("Playlist name cannot be empty");
			} else {
				const new_list = [...playlist.list];
				new_list.sort((a, b) => {
					const id_a = a.id;
					const id_b = b.id;

					if (id_a < id_b) {
						return -1;
					}
					if (id_a > id_b) {
						return 1;
					}
					return 0;
				});
				const id =
					new_list.length > 0
						? new_list[new_list.length - 1].id + 1
						: 1;
				const new_item = { name, id, date_added: new Date().getTime() };
				const list = [...playlist.list, new_item];
				dispatch(
					update_playlist({
						list,
					})
				);
				if (typeof route.params !== "undefined") {
					if (typeof route.params.callback !== "undefined") {
						route.params.callback(e, new_item);
					} else {
						toast.hideAll();
						toast.show("Playlist created successfully");
					}
				} else {
					toast.hideAll();
					toast.show("Playlist created successfully");
				}
				navigation.goBack();
			}
		} catch (ex) {
			console.log(ex);
		}
	};
	const on_edit_press = () => {
		try {
			if (String(name).trim() == "") {
				toast.hideAll();
				toast.show("Playlist name cannot be empty");
			} else {
				const { id } = route.params;
				const list = playlist.list.map(item => {
					if (item.id == id) {
						return {
							id,
							name,
						};
					}
					return item;
				});
				dispatch(
					update_playlist({
						list,
					})
				);
				toast.hideAll();
				toast.show("Renamed successfully");
				navigation.goBack();
			}
		} catch (ex) {
			console.log(ex);
		}
	};
	return (
		<View
			style={{
				flex: 1,
				flexDirection: "row",
				justifyContent: "center",
				alignItems: "center",
				backgroundColor: "rgba(0, 0, 0, 0.45)",
			}}
		>
			<View
				style={{
					backgroundColor: theme.background.content.main,
					width: windowWidth / 1.2,
					padding: 20,
					paddingBottom: 5,
					borderRadius: 10,
					flexDirection: "column",
					alignItems: "flex-start",
					justifyContent: "center",
				}}
			>
				<BLIconButton
					size={20}
					style={{
						position: "absolute",
						right: -12,
						top: -12,
					}}
					onPress={() => navigation.goBack()}
				>
					<MCIcon
						name="close"
						size={20}
						color={theme.font.secodary}
					/>
				</BLIconButton>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "flex-end",
						marginBottom: 5,
					}}
				>
					<Text
						style={{
							fontWeight: "bold",
							fontSize: 12,
							color: theme.font.secodary,
						}}
					>
						{!is_create() ? "Rename playlist" : "Create playlist"}
					</Text>
				</View>
				<TextInput
					value={name}
					onChangeText={on_name_change}
					placeholder="Playlist name: "
					placeholderTextColor="gray"
					style={{
						borderRadius: 5,
						padding: 10,
						color: theme.font.secodary,
						fontWeight: "bold",
						fontSize: 12,
						borderWidth: 1,
						borderColor: "rgba(255, 255, 255, 0.1)",
						width: "100%",
					}}
				/>
				<View
					style={{
						flexDirection: "row",
						justifyContent: "flex-end",
						alignItems: "center",
						marginTop: 5,
						width: "100%",
					}}
				>
					<BLButton
						size={20}
						style={{}}
						onPress={on_cancel_press}
					>
						<Text
							style={{
								fontWeight: "bold",
								fontSize: 12,
								color: theme.font.secodary,
							}}
						>
							CANCEL
						</Text>
					</BLButton>
					<BLButton
						size={20}
						style={{}}
						onPress={e => {
							if (!is_create()) {
								return on_edit_press(e);
							}
							return on_create_press(e);
						}}
					>
						<Text
							style={{
								fontWeight: "bold",
								fontSize: 12,
								color: theme.font.secodary,
							}}
						>
							{!is_create() ? "SAVE" : "CREATE"}
						</Text>
					</BLButton>
				</View>
			</View>
		</View>
	);
}

export default PlaylistAdd;
