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

import Slider from "@react-native-community/slider";

/* Icons */
import ADIcon from "react-native-vector-icons/AntDesign";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import FAIcon from "react-native-vector-icons/FontAwesome";
import SLIcon from "react-native-vector-icons/SimpleLineIcons";
import MIcon from "react-native-vector-icons/MaterialIcons";

import MarqueeText from "react-native-marquee";

/* Components */
import BLButton from "./bl_button";
import BLIconButton from "./bl_icon_button";

import theme from "../../theme/theme";

import { to_hh_mm_ss } from "../../utils/TimeCaster";

import mmkv from "../../storage/mmkv";

const defaut_image = require("../../storage/img/default.png");

const seekbar_interval = null;

let pause_seek = false;

function PlayerBar(props) {
	const { route, navigation } = props;

	const seekbar_ref = useRef(null);
	const position_ref = useRef(0);

	const dispatch = useDispatch();
	const player = useSelector(state => state.player);
	const media = useSelector(state => state.media);

	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const [image, set_image] = useState(defaut_image);

	useEffect(() => {
		const run_async = async () => {
			if (typeof media.list !== "undefined") {
				const found = media.list.find(item => item._id == player.id);
				if (typeof found !== "undefined") {
					NativeModules.MediaScanner.get_media_img(
						found._data,
						found._id
					).then(img => {
						if (img != null) {
							set_image({ uri: `file://${img}` });
						} else {
							set_image(defaut_image);
						}
					});
				}
			}
		};
		run_async();
	}, [player.id, media.list]);

	const on_press = async (item, index) => {
		try {
			navigation.navigate("Player");
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_press_play = async () => {
		try {
			NativeModules.Player.play();
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_press_pause = async () => {
		try {
			NativeModules.Player.pause();
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_press_previous = async () => {
		try {
			NativeModules.Player.previous();
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_press_next = async () => {
		try {
			NativeModules.Player.next();
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_seek_bar_start = async () => {
		try {
			pause_seek = true;
		} catch (ex) {
			console.log(ex);
		}
	};

	return (
		<>
			{player.id !== null ? (
				<TouchableWithoutFeedback onPress={on_press}>
					<View
						style={{
							backgroundColor: "red",
							position: "absolute",
							bottom: 0,
							borderRadius: 30,
							backgroundColor: theme.background.content.main,
							elevation: 10,
							margin: 5,
							left: 0,
							bottom: 0,
							right: 0,
							padding: 5,
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<View
								style={{
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "flex-start",
								}}
							>
								<Image
									source={image}
									style={{
										width: 35,
										height: 35,
										margin: 5,
										borderWidth: 1,
										borderRadius: 0,
										marginLeft: 10,
										borderRadius: 3,
									}}
								/>
								<View
									style={{
										flexDirection: "column",
										alignItems: "flex-start",
										justifyContent: "flex-start",
										marginLeft: 10,
										maxWidth: windowWidth / 2,
									}}
								>
									<MarqueeText
										style={{
											fontSize: 14,
											margin: 5,
											color: theme.font.secodary,
											fontWeight: "bold",
											margin: 0,
										}}
										speed={0.1}
										marqueeOnStart
										delay={2000}
										loop
									>
										{player.title}
									</MarqueeText>
									<MarqueeText
										style={{
											fontSize: 12,
											margin: 5,
											color: theme.font.secodary,
											fontWeight: "normal",
											margin: 0,
										}}
										speed={0.1}
										marqueeOnStart
										delay={2000}
										loop
									>
										{player.artist}
									</MarqueeText>
								</View>
							</View>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "flex-end",
									alignItems: "center",
								}}
							>
								<BLIconButton
									size={20}
									onPress={on_press_previous}
								>
									<MCIcon
										name="skip-previous"
										size={20}
										color={theme.font.secodary}
									/>
								</BLIconButton>
								{player.is_playing ? (
									<BLIconButton
										size={20}
										onPress={on_press_pause}
										color={theme.font.secodary}
									>
										<MCIcon
											name="pause"
											size={20}
											color={theme.font.dark}
										/>
									</BLIconButton>
								) : (
									<BLIconButton
										size={20}
										onPress={on_press_play}
										color={theme.font.secodary}
									>
										<MCIcon
											name="play"
											size={20}
											color={theme.font.dark}
										/>
									</BLIconButton>
								)}
								<BLIconButton
									size={20}
									onPress={on_press_next}
								>
									<MCIcon
										name="skip-next"
										size={20}
										color={theme.font.secodary}
									/>
								</BLIconButton>
							</View>
						</View>
					</View>
				</TouchableWithoutFeedback>
			) : null}
		</>
	);
}

export default PlayerBar;
