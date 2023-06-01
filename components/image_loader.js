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
import BLButton from "./bl_button";

const defaut_image = require("../../storage/img/default.png");

function ImageLoader(props) {
	const { item } = props;

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
		<Image
			{...props}
			source={image}
		/>
	);
}

export default ImageLoader;
