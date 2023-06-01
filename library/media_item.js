/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState, Fragment } from "react";
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

/* Icons */
import ADIcon from "react-native-vector-icons/AntDesign";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import FAIcon from "react-native-vector-icons/FontAwesome";
import SLIcon from "react-native-vector-icons/SimpleLineIcons";

import theme from "../../theme/theme";

import { to_hh_mm_ss } from "../../utils/TimeCaster";

import mmkv from "../../storage/mmkv";

/* Components */
import BLButton from "../components/bl_button";

const defaut_image = require("../../storage/img/default.png");

function MediaItem(props) {
	const { route, navigation } = props.props;
	const {
		item,
		index,
		bucket_display_name,
		list = [],
		onPress = () => {},
		onLongPress = () => {},
	} = props;

	const windowWidth = Dimensions.get("window").width;
	const windowHeight = Dimensions.get("window").height;

	const [image, set_image] = useState(defaut_image);

	useEffect(() => {
		const run_async = async () => {
			const img = await NativeModules.MediaScanner.get_media_img(
				item._data,
				item._id
			);
			if (img != null) {
				set_image({ uri: `file://${img}` });
			} else {
				set_image(defaut_image);
			}
		};
		run_async();
	}, []);

	return (
		<BLButton
			onPress={onPress}
			onLongPress={onLongPress}
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
					<Image
						source={image}
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
				<Text
					style={{
						color: theme.font.secodary,
						fontWeight: "bold",
						fontSize: 11,
						flexWrap: "wrap",
						flexShrink: 1,
						backgroundColor: theme.background.content.main,
						position: "absolute",
						right: -5,
						padding: 4,
						bottom: -5,
						minWidth: 40,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						textAlign: "center",
						borderRadius: 20,
						borderWidth: 0.5,
						elevation: 5,
					}}
				>
					{to_hh_mm_ss(item.duration)}
				</Text>
			</View>
		</BLButton>
	);
}

export default MediaItem;
