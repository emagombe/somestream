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

function PlaylistOrder(props) {
	const { route, navigation } = props;

	const { callback } = route.params;

	const dispatch = useDispatch();

	const toast = useToast();

	const screen_name = "playlist";

	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const [image, set_image] = useState(defaut_image);

	const [column, set_column] = useState("name");
	const [order, set_order] = useState("ASC");

	useEffect(() => {
		if (screen_name === "playlist") {
			const playlist_order = mmkv.getString("PLAYER_PLAYLIST_ORDER");
			if (typeof playlist_order !== "undefined") {
				const data = JSON.parse(playlist_order);
				set_order(data.order);
				set_column(data.column);
			}
		}
	}, []);

	const on_cancel_press = () => {
		navigation.goBack();
	};
	const on_press = (e, pressed_column) => {
		try {
			const _order = order === "ASC" ? "DESC" : "ASC";
			set_order(_order);
			set_column(pressed_column);
			mmkv.set(
				"PLAYER_PLAYLIST_ORDER",
				JSON.stringify({
					column: pressed_column,
					order: _order,
				})
			);
			callback();
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
						height: 10,
					}}
				/>
				<View
					style={{
						width: "100%",
					}}
				>
					<BLButton
						onPress={e => on_press(e, "name")}
						style={{
							borderRadius: 10,
							elevation: 0,
							width: "100%",
						}}
						color="rgba(0, 0, 0, 0)"
						view_style={{
							width: "100%",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
							}}
						>
							<Text
								style={{
									color: theme.font.secodary,
									fontWeight: "bold",
									fontSize: 16,
									flexWrap: "wrap",
									marginLeft: 20,
								}}
							>
								Name
							</Text>
						</View>
						<View>
							{column === "name" ? (
								<MCIcon
									name={
										order === "ASC"
											? "sort-ascending"
											: "sort-descending"
									}
									size={20}
									color={theme.font.secodary}
									style={{}}
								/>
							) : null}
						</View>
					</BLButton>
					<BLButton
						onPress={e => on_press(e, "date_added")}
						style={{
							borderRadius: 10,
							elevation: 0,
							width: "100%",
						}}
						color="rgba(0, 0, 0, 0)"
						view_style={{
							width: "100%",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
							}}
						>
							<Text
								style={{
									color: theme.font.secodary,
									fontWeight: "bold",
									fontSize: 16,
									flexWrap: "wrap",
									marginLeft: 20,
								}}
							>
								Date added
							</Text>
						</View>
						<View>
							{column === "date_added" ? (
								<MCIcon
									name={
										order === "ASC"
											? "sort-ascending"
											: "sort-descending"
									}
									size={20}
									color={theme.font.secodary}
									style={{}}
								/>
							) : null}
						</View>
					</BLButton>
				</View>
			</View>
		</View>
	);
}

export default PlaylistOrder;
