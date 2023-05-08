/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState, useRef, Fragment, useCallback } from 'react';
import type { PropsWithChildren } from 'react';
import {
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	AppState,
	useColorScheme,
	View,
	NativeModules,
	Dimensions,
	FlatList,
	Image,
	TouchableWithoutFeedback,
	Animated,
	TextInput,
	useWindowDimensions,
	TouchableOpacity,
	BackHandler,
} from 'react-native';

import DraggableFlatList from 'react-native-draggable-flatlist';

import { useIsFocused } from "@react-navigation/native";

import CheckBox from '@react-native-community/checkbox';

import { Provider, useSelector, useDispatch, batch } from "react-redux";

import MarqueeText from 'react-native-marquee';

/* Icons */
import ADIcon from 'react-native-vector-icons/AntDesign';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MIcon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import SLIcon from 'react-native-vector-icons/SimpleLineIcons';

import theme from "../../theme/theme";
import PlayerBar from "../components/player_bar";
import mmkv from "../../storage/mmkv";

import { get_folder_content, update_media_state } from "../../classes/Media";
import { update_player } from "../../storage/state/player/player";

/* Components */
import BLButton from "../components/bl_button";
import SeekBarView from "../components/SeekBarView";
import SeekBarViewLinear from "../components/SeekBarViewLinear";
import BLIconButton from "../components/bl_icon_button";
import ImageLoader from "../components/image_loader";
import { to_hh_mm_ss } from "../../utils/TimeCaster";

const defaut_image = require("../../storage/img/default.png");

let init_position = 0;
let seekbar_interval = null;
let scroll_seekbar_momentum_end_timeout = null;
let seek_bar_pressed = false;
let skip_seek_cicles_count = 0;
let scroll_timeout = null;

let load_waveform_done = false;

const Player = (props) => {

	const { route, navigation } = props;

	 const isFocused = useIsFocused();

	const top_icon_button_size = 25;
	const player_itens_opactiy = 0.8;

	const isDarkMode = useColorScheme() === 'dark';
	
	const dimensions = useWindowDimensions();
	const windowWidth = parseInt(dimensions.width);
	const windowHeight = parseInt(dimensions.height) + StatusBar.currentHeight;;

	const WAVEFORM_SIZE = 100;
	const WAVE_LINE_WIDTH = 2;
	const WAVE_LINE_MARGIN = 0;
	const WAVE_WIDTH = 20, WAVE_MARGIN = -13, WAVE_RADIUS = 20;
	const progress_width = windowWidth * 2;
	const max_wave_height = windowHeight / 4;

	const media = useSelector(state => state.media);
	const player = useSelector(state => state.player);

	const dispatch = useDispatch();

	const [image, set_image] = useState(defaut_image);
	const [is_mounted, set_is_mounted] = useState(false);
	const [current_media, set_current_media] = useState({});
	const [waveform, set_waveform] = useState([]);
	const [loading_waveform, set_loading_waveform] = useState(false);
	const [queue, set_queue] = useState([]);
	const [active_index, set_active_index] = useState(null);

	const [player_repeat, set_player_repeat] = useState("repeat");
	const [player_shuffle, set_player_shuffle] = useState("off");
	const [starred, set_starred] = useState(false);
	const [bitrate, set_bitrate] = useState("");

	const [current_index, set_current_index] = useState(0);
	const [queue_edit_mode, set_queue_edit_mode] = useState(false);
	const [selected_queue_items, set_selected_queue_items] = useState([]);

	const appState = useRef(AppState.currentState);
	const scroll_view_ref = useRef(null);
	const seek_scroll_view_1 = useRef(null);
	const seek_scroll_view_2 = useRef(null);
	const seek_scroll_view_main = useRef(null);
	const player_buttons_ref = useRef(null);
	const player_buttons_hidden_ref = useRef(null);
	const seek_ref = useRef(null);
	const seekbar_separator_ref = useRef(null);
	const duration_text_ref = useRef(null);
	const position_text_ref = useRef(null);
	const duration_text_hidden_ref = useRef(null);
	const position_text_hidden_ref = useRef(null);
	const player_bottom_buttons_ref = useRef(null);
	const [seekbar_separator_anim_height, set_seekbar_separator_anim_height] = useState(new Animated.Value(max_wave_height / 2));

	const update_image = async () => {
		const found = media.list.find((item) => item._id == player.id);
		if(typeof found !== "undefined") {
			const img = await NativeModules.MediaScanner.get_media_img(found._data, found._id);
			if(img != null) {
				set_image({ uri: `file://${img}` });
			} else {
				set_image(defaut_image);
			}
			if(typeof found.bitrate !== "undefined") {
				set_bitrate(parseInt(found.bitrate / 1000) + "kbps");
			} else {
				set_bitrate("");
			}
		}
	};

	const update_queue = async () => {
		let list = JSON.parse(mmkv.getString("PLAYER_QUEUE"));
		set_queue(list);
	};

	const update_star = async () => {
		let list = JSON.parse(mmkv.getString("PLAYER_STAR_LIST"));
		const start_found = list.some(item => item == player.id);
		set_starred(start_found);
	};

	const seek_bar_timer = () => {
		clearInterval(seekbar_interval);
		seekbar_interval = setInterval(() => {
			/* Skip initial cicles to prevent seekbar from getting back to old position */
			if(skip_seek_cicles_count > 0) { skip_seek_cicles_count --; return; }

			const position = global.PLAYER_POSITION;
			const duration = global.PLAYER_DURATION;

			if(!global.PLAYER_SEEKING && !seek_bar_pressed) {
				if(typeof position !== "undefined") {
					const position_long = parseFloat(position);
					if(seek_scroll_view_main.current != null) {
						const scroll_to = position_long * progress_width / parseFloat(duration);
						if(!isNaN(scroll_to) && isFinite(scroll_to)) {
							seek_scroll_view_main.current.scrollTo({
								animated: false,
								x: scroll_to,
							});
						}
					}
					if(duration_text_ref.current != null && position_text_ref.current != null) {
						if(!seek_bar_pressed) {
							duration_text_ref.current.setNativeProps({
								text: to_hh_mm_ss(duration),
							});
							position_text_ref.current.setNativeProps({
								text: to_hh_mm_ss(position),
							});
						}
					}
					if(duration_text_hidden_ref.current != null && position_text_hidden_ref.current != null) {
						if(!seek_bar_pressed) {
							duration_text_hidden_ref.current.setNativeProps({
								text: to_hh_mm_ss(duration),
							});
							position_text_hidden_ref.current.setNativeProps({
								text: to_hh_mm_ss(position),
							});
						}
					}
				}
			}
		}, 100);
	};

	/* Component will mount */
	if(!is_mounted) {
		try {
			const run_async = async () => {
				update_image();
				const position = global.PLAYER_POSITION;
				const duration = global.PLAYER_DURATION;
				if(typeof position !== "undefined") {
					const position_long = parseFloat(position);
					if(seek_scroll_view_main.current != null) {
						const scroll_to = position_long * progress_width / parseFloat(duration);
						if(!isNaN(scroll_to)) {
							init_position = scroll_to;
						}
					}
				}
				update_star();
				update_queue();
			};
			run_async();
		} catch (ex) {
			console.log(ex);
		}
		set_is_mounted(true);
	}
	const waveform_update = useCallback(() => {
		const run_async = async () => {
			try {
				set_loading_waveform(true);
				const found = media.list.find((item) => item._id == player.id);
				if(typeof found._data !== "undefined") {
					NativeModules.Waveform.get_waveform(found._data, String(found._id)).then((res) => {
						const json = JSON.parse(res);
						const int_waveform = json.map(item => parseInt(item));
						if(int_waveform != null) {
							set_waveform(int_waveform);
							set_loading_waveform(false);
						}
					}).catch((ex) => {
						console.log("wave ex: ", ex);
					});
				}
			} catch (ex) {
				console.log(ex);
			}
		};
		run_async();
	}, [player.id]);

	useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
        	handleIndexChange(current_index);
        });
        return () => {
        	subscription.remove();
	    };
    }, []);

    useEffect(() => {
    	return () => {
    		duration_text_ref.current = null;
    		position_text_ref.current = null;
    		duration_text_hidden_ref.current = null;
    		position_text_hidden_ref.current = null;
    		set_queue([]);
    		set_image(defaut_image);
    		set_queue([]);
    		set_waveform([]);
    		set_current_media({});
    	};
    }, []);

	useEffect(() => {
		const run_async = async () => {

		};
		run_async();
	}, [media]);

	useEffect(() => {
		seek_bar_timer();
		return () => {
			clearInterval(seekbar_interval);
		};
	}, []);

	useEffect(() => {
		const subscribe = BackHandler.addEventListener('hardwareBackPress', () => {
			if(queue_edit_mode) {
				set_queue_edit_mode(false);
				set_selected_queue_items([]);
				return true;
			}
			if(current_index != 0) {
				handleIndexChange(0);
				return true;
			}
			return false;
		});
		return () => {
			subscribe.remove();
		};
	}, [queue_edit_mode, current_index]);

	useEffect(() => {
		if(current_index == 0) {
			set_queue_edit_mode(false);
			set_selected_queue_items([]);
		}
	}, [current_index]);

	useEffect(() => {
		const run_async = async () => {
			update_image();
			waveform_update();
			update_star();
			update_queue();
		};
		run_async();
	}, [player.id]);

	const onSeekBarScroll = async (e) => {
		try {
			if(seek_scroll_view_1.current != null && seek_scroll_view_2.current != null) {
				seek_scroll_view_1.current.scrollTo({
					x: Number(e.nativeEvent.contentOffset.x),
					animated: false,
				});
				seek_scroll_view_2.current.scrollTo({
					x: Number(e.nativeEvent.contentOffset.x),
					animated: false,
				});
			}
			if(position_text_ref.current != null) {
				if(seek_bar_pressed) {
					const position = Number(e.nativeEvent.contentOffset.x) * global.PLAYER_DURATION / progress_width;
					position_text_ref.current.setNativeProps({
						text: to_hh_mm_ss(position),
					});
				}
			}
			if(position_text_hidden_ref.current != null) {
				if(seek_bar_pressed) {
					const position = Number(e.nativeEvent.contentOffset.x) * global.PLAYER_DURATION / progress_width;
					position_text_hidden_ref.current.setNativeProps({
						text: to_hh_mm_ss(position),
					});
				}
			}
		} catch (ex) {
			console.log(ex);
		}
	}
	const on_seekbar_begin_drag = () => {
		seek_bar_pressed = true;
		if(player_buttons_ref.current != null && player_buttons_hidden_ref.current != null) {
			player_buttons_ref.current.setNativeProps({
				opacity: 0,
			});
			player_bottom_buttons_ref.current.setNativeProps({
				opacity: 0,
			});
			player_buttons_hidden_ref.current.setNativeProps({
				opacity: 0.8,
			});
			if(seekbar_separator_ref.current != null) {
				Animated.timing(seekbar_separator_anim_height, {
					toValue: -10,
					duration: 100,
					useNativeDriver: false,
				}).start();
			}
		}
	};
	const on_seekbar_momentum_scroll_end = async (e) => {
		e.persist();
		clearTimeout(scroll_seekbar_momentum_end_timeout);
		scroll_seekbar_momentum_end_timeout = setTimeout(async () => {
			try {
				const duration = parseFloat(global.PLAYER_DURATION);
				const position = Number(e.nativeEvent.contentOffset.x) * duration / progress_width;
				global.PLAYER_SEEKING = true;
				await NativeModules.Player.seek_to(position);

				player_buttons_ref.current.setNativeProps({
					opacity: player.is_playing ? player_itens_opactiy : 1,
				});
				player_bottom_buttons_ref.current.setNativeProps({
					opacity: player.is_playing ? player_itens_opactiy : 1,
				});
				player_buttons_hidden_ref.current.setNativeProps({
					opacity: 0,
				});
				if(seekbar_separator_ref.current != null) {
					Animated.timing(seekbar_separator_anim_height, {
						toValue: max_wave_height / 2,
						duration: 5,
						useNativeDriver: false,
					}).start();
				}
				seek_bar_pressed = false;
			} catch (ex) {
				console.log(ex);
				seek_bar_pressed = false;
			}
		}, 200);
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

	const on_press_fast_forward = async () => {
		try {
			NativeModules.Player.seek_forward();
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_press_rewind = async () => {
		try {
			NativeModules.Player.seek_back();
		} catch (ex) {
			console.log(ex);
		}
	};

	const player_star_press = async (e) => {
		try {
			let list = JSON.parse(mmkv.getString("PLAYER_STAR_LIST"));
			if(starred) {
				list = list.filter(item => item != player.id);
			} else {
				list.push(player.id);
			}
			mmkv.set("PLAYER_STAR_LIST", JSON.stringify(list));
			set_starred(!starred);
		} catch (ex) {
			console.log(ex);
		}
	};

	const player_repeat_press = useCallback((e) => {
		if(player.repeat === "repeat") {
			NativeModules.Player.set_repeat("repeat-current").then(() => {
				set_player_repeat("repeat-current");
				mmkv.set("PLAYER_REPEAT", "repeat-current");
				dispatch(update_player({ repeat: "repeat-current" }));
			});
		} else if(player.repeat === "repeat-current") {
			NativeModules.Player.set_repeat("off").then(() => {
				set_player_repeat("off");
				mmkv.set("PLAYER_REPEAT", "off");
				dispatch(update_player({ repeat: "off" }));
			});
		} else if(player.repeat === "off") {
			NativeModules.Player.set_repeat("repeat").then(() => {
				set_player_repeat("repeat");
				mmkv.set("PLAYER_REPEAT", "repeat");
				dispatch(update_player({ repeat: "repeat" }));
			});
		}
	}, [player.repeat]);

	const player_shuffle_press = useCallback((e) => {
		if(player.shuffle === "shuffle") {
			NativeModules.Player.set_shuffle("off").then(() => {
				set_player_shuffle("off");
				mmkv.set("PLAYER_SHUFFLE", "off");
				dispatch(update_player({ shuffle: "off" }));
			});
		} else if(player.shuffle === "off") {
			NativeModules.Player.set_shuffle("shuffle").then(() => {
				set_player_shuffle("shuffle");
				mmkv.set("PLAYER_SHUFFLE", "shuffle");
				dispatch(update_player({ shuffle: "shuffle" }));
			});
		}
	}, [player.shuffle]);

	const handleIndexChange = (index) => {
		set_current_index(index);
		if(scroll_view_ref.current != null) {
			scroll_view_ref.current.scrollTo({ y: index * windowHeight, animated: true });
		}
	};
	const handleScroll = (event) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		const index = Math.round(offsetY / windowHeight);
		clearTimeout(scroll_timeout);
		scroll_timeout = setTimeout(() => {
			handleIndexChange(index);
		}, 100);
	};
	const on_scroll_end = (event) => {
		event.persist();
		try {
			
		} catch (ex) {
			console.log(ex);
		}
	};

	const on_drag_complete = ({ data, from, to }) => {
		try {
			NativeModules.Player.move_media(from, to);
			set_queue(data);
			mmkv.set("PLAYER_QUEUE", JSON.stringify(data));
		} catch (ex) {
			console.log(ex);
		}
	};

	const remove_selected_queue = async (e) => {
		try {
			const data = queue.filter((item, index) => !selected_queue_items.some(_item => _item == index) || item._id == player.id);
			const to_remove = queue.filter((item, index) => !data.some(_item => _item._id == item._id));
			let temp_queue = [...queue];
			for(let i = 0; i < to_remove.length; i ++) {
				const index = temp_queue.findIndex(item => item._id == to_remove[i]._id);
				if(typeof index !== "undefined") {
					await NativeModules.Player.remove_item(index);
					temp_queue = temp_queue.filter((item, _index) => _index != index);
				}
			}
			set_queue(data);
			mmkv.set("PLAYER_QUEUE", JSON.stringify(data));
			set_selected_queue_items([]);
			set_queue_edit_mode(false);
		} catch(ex) {
			console.log(ex);
		}
	};
	const on_check_queue_item = (value, item) => {
		const _index = queue.findIndex(_item => _item._id == item._id);
		if(selected_queue_items.some(_item => _item == _index)) {
			/* Remove */
			set_selected_queue_items(selected_queue_items.filter(_item => _item != _index));
		} else {
			/* Add */
			set_selected_queue_items([ ...selected_queue_items, _index ]);
		}
	};

	const on_check_queue_all = (value) => {
		if(selected_queue_items.length < queue.length) {
			/* Select all */
			set_selected_queue_items(queue.map((item, index) => index));
		} else {
			/* Remove all */
			set_selected_queue_items([]);
		}
	};

	const render_item_queue = ({ item, index, drag, isActive, separators }) => {
		const _index = queue.findIndex(_item => _item._id == item._id);
		return (
			<BLButton
				onPress={e => {
					if(queue_edit_mode) {
						if(selected_queue_items.some(item => item == _index)) {
							/* Remove */
							set_selected_queue_items(selected_queue_items.filter(item => item != _index));
						} else {
							/* Add */
							set_selected_queue_items([ ...selected_queue_items, _index ]);
						}
					} else {
						NativeModules.Player.seek_to_index(_index, 0).then(() => {
							NativeModules.Player.play();
						});
					}
				}}
				onLongPress={() => {
					if(!queue_edit_mode) {
						set_queue_edit_mode(true);
						/* Add */
						set_selected_queue_items([ ...selected_queue_items, _index ]);
					} else {
						if(selected_queue_items.some(item => item == _index)) {
							/* Remove */
							set_selected_queue_items(selected_queue_items.filter(item => item != _index));
						} else {
							/* Add */
							set_selected_queue_items([ ...selected_queue_items, _index ]);
						}
					}
				}}
				style={{
					borderRadius: 10,
					marginLeft: 5,
					marginRight: 5,
					elevation: 0,
					width: "95%",
					opacity: isActive ? 0.5 : 1,
				}}
				color={"rgba(0, 0, 0, 0)"}
			>
				<View
					style={{
						width: "100%",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<View
						style={{
							width: "100%",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
						}}
					>
						{queue_edit_mode ? (
							<CheckBox
								tintColors={{
									true: theme.font.secodary,
									false: theme.font.secodary,
								}}
								value={selected_queue_items.some(_item => _item == _index)}
								onValueChange={(e) => on_check_queue_item(e, item)}
								style={{
									marginLeft: -10,
								}}
							/>
						) : null}
						<ImageLoader
							item={item}
							style={{
								width: 60,
								height: 60,
								marginRight: 10,
								borderRadius: 10,
							}}
						/>
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
								{item.title.length > 50 ? item.title.substring(0, 50) + "..." : item.title}
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
								{item.artist.length > 25 ? item.artist.substring(0, 25) + "..." : item.artist}
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
						{/*<Text
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
							}}
						>
							{to_hh_mm_ss(item.duration)}
						</Text>*/}
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
					>
						<TouchableOpacity
							//onPressIn={drag}
							onLongPress={drag}
							style={{

							}}
							delayLongPress={250}
						>
							<MCIcon name="drag-horizontal" size={25} color={theme.font.secodary} />
						</TouchableOpacity>
					</View>
				</View>
			</BLButton>
		);
	};

	return (
		<View 
			style={{
				flex: 1,
				backgroundColor: theme.background.content.main,
			}}
		>
			{!queue_edit_mode ? (
				<View
					style={{
						position: "absolute",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						right: 5.5,
						top: windowHeight / 4,
						zIndex: 500,
						backgroundColor: theme.background.content.main,
						padding: 0,
						borderRadius: 10,
						opacity: player.is_playing ? player_itens_opactiy - 0.1 : 1,
						//display: current_index == 0 ? "flex" : "none",
					}}
				>
					<BLIconButton
						onPress={(e) => {
							handleIndexChange(0);
						}}
						size={15}
						style={{
							margin: 1,
							opacity: player.is_playing ? player_itens_opactiy : 1,
							elevation: 0,
							backgroundColor: "transparent",
						}}
						rippleColor={theme.ripple.main}
					>
						<MCIcon name="play-circle" size={15} color={current_index == 0 ? "white" : theme.font.secodary} />
					</BLIconButton>
					<View style={{ width: 15, height: 0.1, backgroundColor: theme.font.secodary }} ></View>
					<BLIconButton
						onPress={(e) => {
							handleIndexChange(1);
						}}
						size={15}
						style={{
							margin: 1,
							opacity: player.is_playing ? player_itens_opactiy : 1,
							elevation: 0,
							backgroundColor: "transparent",
						}}
						rippleColor={theme.ripple.main}
					>
						<MCIcon name="playlist-music" size={15} color={current_index == 1 ? "white" : theme.font.secodary} />
					</BLIconButton>
				</View>
			) : null}
			<ScrollView
				horizontal={false}
				pagingEnabled
				showsVerticalScrollIndicator={false}
				contentOffset={{ x: 0, y: windowHeight * current_index }}
				contentContainerStyle={{ height: windowHeight * 2 }}
				style={{
					height: windowHeight,
				}}
				onMomentumScrollEnd={on_scroll_end}
				onScroll={handleScroll}
				ref={scroll_view_ref}
			>
				<View
					style={{
						flex: 1,
						height: windowHeight,
						width: windowWidth,
					}}
				>
					<View
						style={{
							width: windowWidth,
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							position: "absolute",
							top: 32,
							left: 0,
							right: 0,
							zIndex: 1,
						}}
					>
						<View>
							<BLIconButton
								onPress={(e) => {
									navigation.pop();
								}}
								size={20}
								style={{
									margin: 10,
									opacity: player.is_playing ? player_itens_opactiy - 0.3 : 1,
								}}
								rippleColor={theme.ripple.main}
							>
								<MCIcon name="chevron-down" size={20} color={theme.font.secodary} />
							</BLIconButton>
						</View>
						<View
							style={{

							}}
						>
							
						</View>
						<View>
							<BLIconButton
								onPress={(e) => {}}
								size={20}
								style={{
									margin: 10,
									opacity: player.is_playing ? player_itens_opactiy - 0.3 : 1,
								}}
							>
								<MIcon name="more-vert" size={20} color={theme.font.secodary} />
							</BLIconButton>
						</View>
					</View>
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
							backgroundColor: theme.background.content.main,
							opacity: 0.55,
							position: "absolute",
							top: 0,
							bottom: 0,
							right: 0,
							left: 0,
						}}
					></View>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: 10,
							margin: 10,
							elevation: 5,
							marginTop: 40,
						}}
					>
						<Image
							source={image}
							style={{
								width: windowWidth - 10,
								height: windowHeight / 2,
								borderRadius: 10,
							}}
						/>
						<Text
							style={{
								color: theme.font.secodary,
								letterSpacing: 1,
								fontSize: 11,
								padding: 4,
								marginTop: 0,
								fontWeight: "bold",
								backgroundColor: theme.background.content.main,
								borderRadius: 10,
								opacity: player.is_playing ? player_itens_opactiy - 0.4 : 1,
								position: "absolute",
								right: -3,
								bottom: 2,
							}}
						>
							{bitrate}
						</Text>
					</View>
					<View
						style={{
							flexDirection: "row",
							justifyContent: "space-between",
							alignItems: "flex-start",
							marginLeft: 10,
							marginRight: 10,
						}}
					>
						<View
							style={{
								flexDirection: "column",
								alignItems: "flex-start",
								justifyContent: "flex-start",
								opacity: player.is_playing ? player_itens_opactiy + 0.1 : 1,
							}}
						>
							<View
								style={{
									backgroundColor: theme.background.content.main,
									borderRadius: 0,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									padding: 5,
									paddingTop: 0,
									paddingBottom: 0,
									borderRadius: 10,
									margin: 1.5,
									maxWidth: windowWidth / 1.6,
								}}
							>
								<MarqueeText
									style={{
										fontSize: 14,
										fontWeight: 'bold',
										color: theme.font.secodary,
										margin: 5,
									}}
									speed={0.1}
									marqueeOnStart={true}
									delay={2000}
									loop={true}
								>
									{player.id !== null ? player.title : null}
								</MarqueeText>
							</View>
							<View
								style={{
									backgroundColor: theme.background.content.main,
									borderRadius: 0,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									padding: 5,
									paddingTop: 0,
									paddingBottom: 0,
									borderRadius: 10,
									margin: 1.5,
									maxWidth: windowWidth / 1.6,
								}}
							>
								<MarqueeText
									style={{
										fontSize: 12,
										fontWeight: 'bold',
										color: theme.font.secodary,
										margin: 5,
									}}
									speed={0.1}
									marqueeOnStart={true}
									delay={2000}
									loop={true}
								>
									{player.id !== null ? player.artist : null}
								</MarqueeText>
							</View>
						</View>
						<View
							style={{
								backgroundColor: theme.background.content.main,
								borderRadius: 0,
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								padding: 0,
								paddingTop: 0,
								paddingBottom: 0,
								borderRadius: 10,
							}}
						>
							<BLIconButton
								size={20}
								onPress={player_star_press}
								style={{
									marginTop: 0,
									marginBottom: 0,
								}}
							>
								{(() => {
									if(starred) {
										return <ADIcon name="star" size={20} color={theme.font.secodary} />;
									} else {
										return <ADIcon name="staro" size={20} color={theme.font.low} />
									}
								})()}
							</BLIconButton>
							<BLIconButton
								size={20}
								onPress={player_shuffle_press}
								style={{
									marginTop: 0,
									marginBottom: 0,
								}}
							>
								{(() => {
									switch(player.shuffle) {
										case "shuffle":
											return <MCIcon name="shuffle-variant" size={20} color={theme.font.secodary} />;
											break;
										default:
											return <MCIcon name="shuffle-variant" size={20} color={theme.font.low} />
									}
								})()}
							</BLIconButton>
							<BLIconButton
								size={20}
								onPress={player_repeat_press}
								style={{
									marginTop: 0,
									marginBottom: 0,
								}}
							>
								{(() => {
									switch(player.repeat) {
										case "repeat":
											return <MCIcon name="repeat" size={20} color={theme.font.secodary} />;
											break;
										case "repeat-current":
											return <MCIcon name="repeat-once" size={20} color={theme.font.secodary} />;
											break;
										default:
											return <MCIcon name="repeat" size={20} color={theme.font.low} />;
									}
								})()}
							</BLIconButton>
						</View>
					</View>
					<View
						style={{
							width: windowWidth,
							height: max_wave_height,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							marginTop: 0,
						}}
					>
						<ScrollView
							decelerationRate={0.9}
							showsHorizontalScrollIndicator={false}
							showsVerticalScrollIndicator={false}
							ref={seek_scroll_view_main}
							onScrollBeginDrag={on_seekbar_begin_drag}
							onMomentumScrollEnd={on_seekbar_momentum_scroll_end}
							//onTouchStart={on_seekbar_begin_drag}
							contentOffset={{ x: init_position, y: 0 }}
							horizontal
							style={{
								backgroundColor: "transparent",
								position: "absolute",
								top: 0,
								left: 0,
								bottom: 0,
								right: 0,
								zIndex: 15,
							}}
							onScroll={onSeekBarScroll}
						>
							<TouchableWithoutFeedback
								//onPress={on_play_pause_press}
							>
								<View
									style={{
										width: progress_width * 3,
										height: max_wave_height,
										backgroundColor: "transparent",
									}}
								>
								</View>
							</TouchableWithoutFeedback>
						</ScrollView>
						<Fragment>
							<ScrollView
								showsHorizontalScrollIndicator={false}
								showsVerticalScrollIndicator={false}
								scrollEnabled={false}
								ref={seek_scroll_view_1}
								horizontal
								style={{
									width: windowWidth / 2,
									height: max_wave_height,
								}}
							>
								<SeekBarViewLinear
									ref={seek_ref}
									name="seek_1"
									waveform={waveform}
									wave_width={WAVE_WIDTH}
									wave_margin={WAVE_MARGIN}
									wave_color="#787878"
									wave_radius={WAVE_RADIUS}
									loading={loading_waveform}
									wave_line_width={WAVE_LINE_WIDTH}
									wave_line_margin={WAVE_LINE_MARGIN}
									style={{
										width: progress_width,
										marginLeft: windowWidth / 2,
										height: max_wave_height,
										opacity: 0.6,
									}}
								/>
							</ScrollView>
							<ScrollView
								showsHorizontalScrollIndicator={false}
								showsVerticalScrollIndicator={false}
								scrollEnabled={false}
								ref={seek_scroll_view_2}
								horizontal
								style={{
									width: windowWidth / 2,
									height: max_wave_height,
								}}
							>
								<SeekBarViewLinear
									ref={seek_ref}
									name="seek_2"
									waveform={waveform}
									wave_width={WAVE_WIDTH}
									wave_margin={WAVE_MARGIN}
									wave_color="#ffffff"
									wave_radius={WAVE_RADIUS}
									loading={loading_waveform}
									wave_line_width={WAVE_LINE_WIDTH}
									wave_line_margin={WAVE_LINE_MARGIN}
									style={{
										width: progress_width,
										marginRight: windowWidth / 2,
										height: max_wave_height,
										opacity: 0.8,
									}}
								/>
							</ScrollView>
						</Fragment>
						<View
							style={{
								display: "flex",
								flexDirection: "row",
								justifyContent: "center",
								alignItems: "center",
								position: "absolute",
								left: 0,
								right: 0,
								height: max_wave_height,
								zIndex: 50,
								opacity: player.is_playing ? player_itens_opactiy : 1,
							}}
							pointerEvents="box-none"
							ref={player_buttons_ref}
						>
							<View
								style={{
									backgroundColor: theme.background.content.main,
									borderRadius: 0,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									padding: 10,
									marginRight: 0,
									paddingTop: 0,
									paddingBottom: 0,
									borderRadius: 0,
								}}
							>
								<View
									style={{
										borderRadius: 0,
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "center",
										padding: 5,
										marginRight: 0,
										paddingTop: 0,
										paddingBottom: 0,
										borderRadius: 0,
									}}
								>
									<TextInput
										ref={position_text_ref}
										value={to_hh_mm_ss(0)}
										color={theme.font.secodary}
										editable={false}
										style={{
											fontSize: 14,
											fontWeight: "bold",
											padding: 0,
										}}
									/>
								</View>
								{player.is_playing ? (
									<BLIconButton
										size={20}
										onPress={on_press_pause}
										color={"transparent"}
										style={{
											elevation: 0,
											margin: 0,
											borderColor: theme.font.secodary,
											borderWidth: 0.07,
											borderRadius: 0,
										}}
									>
										<MCIcon name="pause" size={20} color={theme.font.secodary} />
									</BLIconButton>
								) : (
									<BLIconButton
										size={20}
										onPress={on_press_play}
										color={"transparent"}
										style={{
											elevation: 0,
											margin: 0,
											borderColor: theme.font.secodary,
											borderWidth: 0.07,
											borderRadius: 0,
										}}
									>
										<MCIcon name="play" size={20} color={theme.font.secodary} />
									</BLIconButton>
								)}
								<View
									style={{
										borderRadius: 0,
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "center",
										padding: 5,
										marginLeft: 0,
										paddingTop: 0,
										paddingBottom: 0,
										borderRadius: 0,
									}}
								>
									<TextInput
										ref={duration_text_ref}
										value={to_hh_mm_ss(0)}
										color={theme.font.secodary}
										editable={false}
										style={{
											fontSize: 14,
											fontWeight: "bold",
											padding: 0,
										}}
									/>
								</View>
							</View>
						</View>
						<View
							style={{
								display: "flex",
								flexDirection: "row",
								justifyContent: "center",
								alignItems: "center",
								position: "absolute",
								left: 0,
								right: 0,
								height: max_wave_height,
								zIndex: 16,
								opacity: 0,
							}}
							pointerEvents="box-none"
							ref={player_buttons_hidden_ref}
						>
							<View
								style={{
									backgroundColor: theme.background.content.main,
									borderRadius: 0,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									padding: 10,
									paddingTop: 0,
									paddingBottom: 0,
									borderRadius: 0,
									marginRight: 1,
								}}
							>
								<TextInput
									ref={position_text_hidden_ref}
									value={to_hh_mm_ss(0)}
									color={theme.font.secodary}
									editable={false}
									style={{
										fontSize: 30,
										fontWeight: "bold",
										padding: 0,
									}}
								/>
							</View>
							<View
								style={{
									backgroundColor: theme.background.content.main,
									borderRadius: 0,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									padding: 10,
									paddingTop: 0,
									paddingBottom: 0,
									borderRadius: 0,
									marginLeft: 1,
								}}
							>
								<TextInput
									ref={duration_text_hidden_ref}
									value={to_hh_mm_ss(0)}
									color={theme.font.secodary}
									editable={false}
									style={{
										fontSize: 30,
										fontWeight: "bold",
										padding: 0,
									}}
								/>
							</View>
						</View>
						<View
							style={{
								position: "absolute",
								flexDirection: "column",
								justifyContent: "center",
								alignItems: "center",
								bottom: -30,
								zIndex: 50,
								opacity: player.is_playing ? player_itens_opactiy : 1,
							}}
							ref={player_bottom_buttons_ref}
						>
							<View
								style={{
									backgroundColor: theme.background.content.main,
									borderRadius: 0,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									padding: 0,
									paddingTop: 0,
									paddingBottom: 0,
									borderRadius: 10,
								}}
							>
								<BLIconButton
									size={25}
									onPress={on_press_rewind}
									color={"transparent"}
									style={{
										elevation: 0,
									}}
								>
									<MCIcon name="rewind" size={25} color={theme.font.secodary} />
								</BLIconButton>
								<BLIconButton
									size={25}
									onPress={on_press_previous}
									color={"transparent"}
									style={{
										elevation: 0,
									}}
								>
									<MCIcon name="skip-previous" size={25} color={theme.font.secodary} />
								</BLIconButton>
								<BLIconButton
									size={25}
									color={"transparent"}
									onPress={on_press_next}
									style={{
										elevation: 0,
									}}
								>
									<MCIcon name="skip-next" size={25} color={theme.font.secodary} />
								</BLIconButton>
								<BLIconButton
									size={25}
									onPress={on_press_fast_forward}
									color={"transparent"}
									style={{
										elevation: 0,
									}}
								>
									<MCIcon name="fast-forward" size={25} color={theme.font.secodary} />
								</BLIconButton>
							</View>
						</View>
						<Animated.View
							ref={seekbar_separator_ref}
							style={[
								{
									backgroundColor: theme.font.main,
									position: "absolute",
									alignSelf: "center",
									width: 2,
									borderRadius: 10,

								},
								{
									bottom: seekbar_separator_anim_height,
									top: seekbar_separator_anim_height,
								}
							]}
						></Animated.View>
					</View>
				</View>
				<View
					style={{
						height: windowHeight,
						width: windowWidth,
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
						}}
						resizeMode="cover"
						blurRadius={100}
					/>
					<View
						style={{
							flex: 1,
							backgroundColor: theme.background.content.main,
							opacity: 0.55,
							position: "absolute",
							top: 0,
							bottom: 0,
							right: 0,
							left: 0,
						}}
					></View>
					<View
						style={{
							marginTop: 0,
							position: "absolute",
							top: 40,
							left: 0,
							right: 5,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<BLIconButton
							size={40}
							onPress={() => handleIndexChange(0)}
							color={theme.background.content.main}
							style={{
								zIndex: 500,
								top: 0,
								marginLeft: 10,
								borderRadius: 10,
								backgroundColor: theme.background.content.main,
								elevation: 0,
							}}
						>
							<Text
								style={{
									fontWeight: "bold",
									fontSize: 16,
									textAlign: "center",
									borderRadius: 10,
									alignSelf: "flex-start",
									padding: 5,
									zIndex: 2,
									color: theme.font.secodary,
								}}
							>
								<MCIcon name="arrow-up-left" style={{ marginRight: 5, marginLeft: 5, }} size={20} color={theme.font.secodary} />
								{player.id !== null ? ((player.artist + " - " + player.title).length > 25 ? (player.artist + " - " + player.title).substring(0, 25) + "..." : player.artist + " - " + player.title) : null}
							</Text>
						</BLIconButton>
						{queue_edit_mode ? (
							<View
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "flex-end",
								}}
							>
								<BLIconButton
									size={20}
									onPress={e => {
										set_queue_edit_mode(false);
										set_selected_queue_items([]);
									}}
									style={{
										opacity: player.is_playing ? player_itens_opactiy : 1,
									}}
								>
									<MCIcon name="close" size={20} color={theme.font.secodary} />
								</BLIconButton>
								<BLIconButton
									size={20}
									onPress={remove_selected_queue}
									style={{
										opacity: player.is_playing ? player_itens_opactiy : 1,
									}}
								>
									<MCIcon name="delete" size={20} color={theme.font.secodary} />
								</BLIconButton>
							</View>
						) : null}
					</View>

					<View
						style={{
							marginTop: 100,
						}}
					>

					</View>
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
						Queue ({ queue.length })
					</Text>
					{queue_edit_mode ? (
						<Text
							style={{
								backgroundColor: theme.background.content.main,
								padding: 5,
								paddingRight: 10,
								paddingLeft: 10,
								borderRadius: 10,
								position: "absolute",
								right: 5,
								top: 130,
								fontWeight: "bold",
								fontSize: 12,
								color: theme.font.secodary,
								zIndex: 500,
							}}
						>
							{selected_queue_items.length}/{queue.length}
						</Text>
					) : null}
					{queue_edit_mode ? (
						<CheckBox
							tintColors={{
								true: theme.font.secodary,
								false: theme.font.secodary,
							}}
							value={selected_queue_items.length == queue.length}
							onValueChange={on_check_queue_all}
							style={{
								position: "absolute",
								top: 143,
								left: 10,
								zIndex: 500,
							}}
						/>
					) : null}
					<ScrollView
						horizontal={true}
						scrollEnabled={false}
						style={{
							flex: 1,
							marginTop: 10,
							width: windowWidth,
							borderTopLeftRadius: 20,
							borderTopRightRadius: 20,
							backgroundColor: "rgba(0, 0, 0, 0.45)",
							paddingTop: queue_edit_mode ? 32 : 10,
						}}
					>
						<DraggableFlatList
							showsHorizontalScrollIndicator={false}
							showsVerticalScrollIndicator={false}
							nestedScrollEnabled={true}
							horizontal={false}
							keyExtractor={(item, index) => item._id + "_" + index}
							data={queue}
							activationDistance={0}
							renderItem={render_item_queue}
							overScrollMode="always"
							style={{

							}}
							windowSize={5}
							initialNumToRender={10}
							contentContainerStyle={{
								paddingBottom: windowHeight / 5,
								marginRight: 10,
								paddingTop: 10,
								paddingRight: 5,
								justifyContent: "flex-start",
								alignItems: "center",
								width: windowWidth,
							}}
							onDragEnd={on_drag_complete}
						/>
					</ScrollView>
				</View>
			</ScrollView>
		</View>
	);
}
export default Player;
