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
import { useToast } from "react-native-toast-notifications";

/* Components */
import BLButton from "./bl_button";
import BLIconButton from "./bl_icon_button";

import theme from "../../theme/theme";

import { to_hh_mm_ss } from "../../utils/TimeCaster";

import mmkv from "../../storage/mmkv";

import { update_playlist } from "../../storage/state/playlist/playlist";

const defaut_image = require("../../storage/img/default.png");

function BLAlert(props) {
	const { route, navigation } = props;

	const {
		message = "",
		confirm_message = "Confirm",
		cancel_message = "Cancel",
		onConfirmPress = () => {},
	} = route.params;

	const dispatch = useDispatch();
	const player = useSelector(state => state.player);
	const playlist = useSelector(state => state.playlist);
	const media = useSelector(state => state.media);

	const toast = useToast();

	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const [image, set_image] = useState(defaut_image);

	const onCancelPress = () => {
		navigation.goBack();
	};

	const on_press_confirm = () => {
		onConfirmPress();
		navigation.goBack();
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
						paddingTop: 10,
						paddingBottom: 10,
					}}
				>
					<Text
						style={{
							fontWeight: "bold",
							fontSize: 14,
							color: theme.font.secodary,
						}}
					>
						{message}
					</Text>
				</View>
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
						onPress={onCancelPress}
					>
						<Text
							style={{
								fontWeight: "bold",
								fontSize: 12,
								color: theme.font.secodary,
							}}
						>
							{cancel_message}
						</Text>
					</BLButton>
					<BLButton
						size={20}
						style={{}}
						onPress={on_press_confirm}
					>
						<Text
							style={{
								fontWeight: "bold",
								fontSize: 12,
								color: theme.font.secodary,
							}}
						>
							{confirm_message}
						</Text>
					</BLButton>
				</View>
			</View>
		</View>
	);
}

export default BLAlert;
