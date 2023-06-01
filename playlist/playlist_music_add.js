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

function PlaylistMusicAdd(props) {
	const { route, navigation } = props;

	const { on_press = () => {} } = route.params;

	const dispatch = useDispatch();
	const player = useSelector(state => state.player);
	const playlist = useSelector(state => state.playlist);
	const media = useSelector(state => state.media);

	const toast = useToast();

	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	useEffect(() => {}, []);

	const on_cancel_press = () => {
		navigation.goBack();
	};
	const on_create_new_press = () => {
		navigation.pop();
		navigation.navigate("PlaylistAdd", {
			callback: on_press,
		});
	};
	const on_press_playlist = (e, item) => {
		on_press(e, item);
		navigation.goBack();
	};

	const render_item = ({ item, index, separators }) => (
		<BLButton
			onPress={e => on_press_playlist(e, item)}
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
					backgroundColor: "rgba(0, 0, 0, 0.95)",
					width: windowWidth / 1.2,
					padding: 5,
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
					}}
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
							marginLeft: 5,
							padding: 5,
							paddingRight: 10,
							paddingLeft: 10,
							zIndex: 2,
						}}
					>
						({playlist.list.length}) Select the playlist:
					</Text>
				</View>
				<FlatList
					showsHorizontalScrollIndicator={false}
					showsVerticalScrollIndicator
					horizontal={false}
					keyExtractor={(item, index) => item.id}
					data={playlist.list}
					renderItem={render_item}
					overScrollMode="always"
					style={{
						maxHeight: windowHeight / 2,
					}}
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
						onPress={on_create_new_press}
					>
						<Text
							style={{
								fontWeight: "bold",
								fontSize: 12,
								color: theme.font.secodary,
							}}
						>
							CREATE NEW
						</Text>
					</BLButton>
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
				</View>
			</View>
		</View>
	);
}

export default PlaylistMusicAdd;
