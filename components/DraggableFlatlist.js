import React, { useEffect, useState, Fragment, useRef } from "react";
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
	PanResponder,
	Animated,
} from "react-native";

function DraggableFlatlist(props) {
	const [enabled, set_enabled] = useState(false);

	const panResponder_ref = useRef(null);

	const onMoveShouldSetPanResponder = (evt, gestureState) => true;

	const panResponder = PanResponder.create({
		// Ask to be the responder:
		// onStartShouldSetPanResponder: (evt, gestureState) => true,
		// onStartShouldSetPanResponderCapture: (evt, gestureState) => enabled,
		onMoveShouldSetPanResponder: (evt, gestureState) => true,
		onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
		// onPanResponderGrant: (evt, gestureState) => {
		// The gesture has started. Show visual feedback so the user knows
		// what is happening!
		// gestureState.d{x,y} will be set to zero now

		// },
		onPanResponderMove: (evt, gestureState) => {
			// The most recent move distance is gestureState.move{X,Y}
			// The accumulated gesture distance since becoming responder is
			// gestureState.d{x,y}
			console.log(gestureState);
		},
		// onPanResponderRelease: (evt, gestureState) => {
		// The user has released all touches while this view is the
		// responder. This typically means a gesture has succeeded
		// },
		// onPanResponderTerminate: (evt, gestureState) => {
		// Another component has become the responder, so this gesture
		// should be cancelled
		// },
		// onShouldBlockNativeResponder: (evt, gestureState) => {
		// Returns whether this component should block native components from becoming the JS
		// responder. Returns true by default. Is currently only supported on android.
		// return true;
		// },
	});

	const dragStart = () => {
		panResponder_ref.current.panResponderHandlers.onMoveShouldSetPanResponder =
			onMoveShouldSetPanResponder;
		panResponder_ref.current.panResponderHandlers.onMoveShouldSetPanResponder();
	};
	const dragEnd = () => {
		panResponder_ref.current.panResponderHandlers.onMoveShouldSetPanResponder =
			() => false;
		panResponder_ref.current.panResponderHandlers.onMoveShouldSetPanResponder();
	};
	const render_item = params => {
		const info = { ...params, dragStart, dragEnd };

		return props.renderItem(params);
	};

	// const responder = enabled ? panResponder.panHandlers : {};

	return (
		<Animated.View
			{...panResponder.panHandlers}
			ref={panResponder_ref}
		>
			<FlatList
				// scrollEnabled={!enabled}
				{...props}
				renderItem={render_item}
			/>
		</Animated.View>
	);
}

export default DraggableFlatlist;
