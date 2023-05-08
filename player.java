package com.znbox.beatlevels.services;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.BitmapDrawable;
import android.media.MediaMetadataRetriever;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.ResultReceiver;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationChannelCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.google.android.exoplayer2.C;
import com.google.android.exoplayer2.DefaultRenderersFactory;
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.MediaMetadata;
import com.google.android.exoplayer2.audio.AudioProcessor;
import com.google.android.exoplayer2.audio.AudioSink;
import com.google.android.exoplayer2.audio.DefaultAudioSink;
import com.google.android.exoplayer2.audio.TeeAudioProcessor;
import com.google.android.exoplayer2.extractor.DefaultExtractorsFactory;
import com.google.android.exoplayer2.extractor.mp3.Mp3Extractor;
import com.google.android.exoplayer2.source.DefaultMediaSourceFactory;
import com.google.android.exoplayer2.source.MediaSource;
import com.google.android.exoplayer2.source.ProgressiveMediaSource;
import com.google.android.exoplayer2.upstream.DataSource;
import com.google.android.exoplayer2.upstream.DefaultDataSource;
import com.google.android.exoplayer2.upstream.DefaultDataSourceFactory;
import com.znbox.beatlevels.MainActivity;
import com.znbox.beatlevels.MainApplication;
import com.znbox.beatlevels.R;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.ArrayList;

public class Player extends Service {

	private ReactInstanceManager mReactInstanceManager;
	private ReactContext mReactContext;
	public static HandlerThread handlerThread = new HandlerThread("PlayerThread");
	public static HandlerThread notification_thread_handler = new HandlerThread("NotificationThread");
	public static HandlerThread notification_thread_handler2 = new HandlerThread("NotificationThread2");
	public static HandlerThread notification_thread_handler3 = new HandlerThread("NotificationThread3");
	private static ExoPlayer exoPlayer = null;
	private static Handler volume_handler = new Handler();
	private static Handler player_position_handler = new Handler();
	private static Handler media_transition_handler = new Handler();
	private static Runnable volume_runner = null;
	private static Runnable media_transition_runner = null;
	private static Runnable player_position_runner = null;

	private static Notification player_notification = null;
	private static MediaSessionCompat mediaSessionCompat = null;

	/* Notification Actions */
	public static final String ACTION_PLAY = "play";
	public static final String ACTION_PAUSE = "pause";
	public static final String ACTION_NEXT = "next";
	public static final String ACTION_PREVIOUS = "previous";
	public static final String ACTION_STOP = "stop";
	public Player() {
		handlerThread.start();
		notification_thread_handler.start();
		notification_thread_handler2.start();
		notification_thread_handler3.start();
		volume_handler = new Handler(handlerThread.getLooper());
		media_transition_handler = new Handler(handlerThread.getLooper());
		player_position_handler = new Handler(handlerThread.getLooper());
	}

	@SuppressLint({"ServiceCast", "UnspecifiedImmutableFlag"})
	private void create_notification(MediaMetadata player_mediaMetadata, long duration, boolean is_playing) {

		Runnable run = () -> {
			try {
				/* Notification */
				String CHANNEL_ID = "BeatLevels Player";
				String CHANNEL_NAME = "BeatLevels Channel";
				NotificationChannelCompat notificationChannelCompat = new NotificationChannelCompat.Builder(CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_NONE)
						.setLightColor(Color.BLUE)
						.setName(CHANNEL_NAME)
						.build();
				byte[] buff = player_mediaMetadata.artworkData;
				Bitmap bitmap = BitmapFactory.decodeByteArray(buff, 0, buff != null ? buff.length : 0);

				if(mediaSessionCompat == null) {
					mediaSessionCompat = new MediaSessionCompat(getApplicationContext(), "Player");
					/* Setting playback state here because exoplayer onIsPlayingChanged doesn't fire on set music */
					mediaSessionCompat.setPlaybackState(new PlaybackStateCompat.Builder()
							.setState(PlaybackStateCompat.STATE_PLAYING, 0, 1)
							.setActions(PlaybackStateCompat.ACTION_SEEK_TO)
							.build()
					);
				}
				android.media.MediaMetadata mediaMetadata = new android.media.MediaMetadata.Builder()
						.putBitmap(android.media.MediaMetadata.METADATA_KEY_ALBUM_ART, bitmap)
						.putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, (String) player_mediaMetadata.artist)
						.putString(android.media.MediaMetadata.METADATA_KEY_ALBUM, (String) player_mediaMetadata.albumTitle)
						.putString(android.media.MediaMetadata.METADATA_KEY_TITLE, (String) player_mediaMetadata.title)
						.putLong(android.media.MediaMetadata.METADATA_KEY_DURATION, duration)
						.build();
				mediaSessionCompat.setMetadata(MediaMetadataCompat.fromMediaMetadata(mediaMetadata));
				mediaSessionCompat.setCallback(new MediaSessionCompat.Callback() {
					@Override
					public void onPlay() {
						Intent intent = new Intent();
						intent.setAction("PLAY");
						intent.setClass(getApplicationContext(), Player.class);
						if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
							startForegroundService(intent);
						}
					}

					@Override
					public void onPause() {
						Intent intent = new Intent();
						intent.setAction("PAUSE");
						intent.setClass(getApplicationContext(), Player.class);
						if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
							startForegroundService(intent);
						}
					}

					@Override
					public void onSeekTo(long pos) {
						super.onSeekTo(pos);
						Intent intent = new Intent();
						intent.setAction("SEEK_TO");
						intent.putExtra("position", pos);
						intent.setClass(getApplicationContext(), Player.class);
						if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
							startForegroundService(intent);
						}
					}

					@Override
					public boolean onMediaButtonEvent(Intent mediaButtonEvent) {
						//String action = mediaButtonEvent.getAction();

						return super.onMediaButtonEvent(mediaButtonEvent);
					}

					@Override
					public void onSkipToNext() {
						super.onSkipToNext();
						Intent intent = new Intent();
						intent.setAction("NEXT");
						intent.setClass(getApplicationContext(), Player.class);
						if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
							startForegroundService(intent);
						}
					}

					@Override
					public void onSkipToPrevious() {
						super.onSkipToPrevious();
						Intent intent = new Intent();
						intent.setAction("PREVIOUS");
						intent.setClass(getApplicationContext(), Player.class);
						if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
							startForegroundService(intent);
						}
					}
				});
				mediaSessionCompat.setActive(true);
				androidx.media.app.NotificationCompat.MediaStyle mediaStyle = new androidx.media.app.NotificationCompat.MediaStyle()
						.setShowActionsInCompactView(0, 1, 2)
						.setMediaSession(MediaSessionCompat.Token.fromToken(mediaSessionCompat.getSessionToken().getToken()));

				/* Setting playback actions */
				Intent pauseIntent = new Intent(getApplicationContext(), Player.class);
				Bundle bundle_pause = new Bundle();
				pauseIntent.setAction("PAUSE");
				pauseIntent.putExtras(bundle_pause);
				PendingIntent pause_pendingIntent;
				if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
					pause_pendingIntent = PendingIntent.getService(getApplicationContext(), 1, pauseIntent, PendingIntent.FLAG_MUTABLE);
				} else {
					pause_pendingIntent = PendingIntent.getService(getApplicationContext(), 1, pauseIntent, PendingIntent.FLAG_UPDATE_CURRENT);
				}
				NotificationCompat.Action pause_action = new NotificationCompat.Action.Builder(R.drawable.round_pause_24, ACTION_PAUSE, pause_pendingIntent).build();

				Intent playIntent = new Intent(getApplicationContext(), Player.class);
				Bundle bundle_play = new Bundle();
				playIntent.setAction("PLAY");
				playIntent.putExtras(bundle_play);
				PendingIntent play_pendingIntent;
				if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
					play_pendingIntent = PendingIntent.getService(getApplicationContext(), 2, playIntent, PendingIntent.FLAG_MUTABLE);
				} else {
					play_pendingIntent = PendingIntent.getService(getApplicationContext(), 2, playIntent, PendingIntent.FLAG_UPDATE_CURRENT);
				}
				NotificationCompat.Action play_action = new NotificationCompat.Action.Builder(R.drawable.round_play_arrow_24, ACTION_PLAY, play_pendingIntent).build();

				Intent stopIntent = new Intent(getApplicationContext(), Player.class);
				Bundle bundle_stop = new Bundle();
				stopIntent.setAction("STOP");
				stopIntent.putExtras(bundle_stop);
				PendingIntent stop_pendingIntent;
				if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
					stop_pendingIntent = PendingIntent.getService(getApplicationContext(), 0, stopIntent, PendingIntent.FLAG_MUTABLE);
				} else {
					stop_pendingIntent = PendingIntent.getService(getApplicationContext(), 0, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT);
				}
				NotificationCompat.Action stop_action = new NotificationCompat.Action.Builder(R.drawable.round_close_24, ACTION_STOP, stop_pendingIntent).build();

				Intent nextIntent = new Intent(getApplicationContext(), Player.class);
				nextIntent.setAction("NEXT");
				Bundle bundle_next = new Bundle();
				nextIntent.putExtras(bundle_next);
				PendingIntent next_pendingIntent;
				if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
					next_pendingIntent = PendingIntent.getService(getApplicationContext(), 3, nextIntent, PendingIntent.FLAG_MUTABLE);
				} else {
					next_pendingIntent = PendingIntent.getService(getApplicationContext(), 3, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT);
				}
				NotificationCompat.Action next_action = new NotificationCompat.Action.Builder(R.drawable.round_skip_next_24, ACTION_NEXT, next_pendingIntent).build();

				Intent previousIntent = new Intent(getApplicationContext(), Player.class);
				previousIntent.setAction("PREVIOUS");
				Bundle bundle_previous = new Bundle();
				previousIntent.putExtras(bundle_previous);
				PendingIntent previous_pendingIntent;
				if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
					previous_pendingIntent = PendingIntent.getService(getApplicationContext(), 4, previousIntent, PendingIntent.FLAG_MUTABLE);
				} else {
					previous_pendingIntent = PendingIntent.getService(getApplicationContext(), 4, previousIntent, PendingIntent.FLAG_UPDATE_CURRENT);
				}
				NotificationCompat.Action previous_action = new NotificationCompat.Action.Builder(R.drawable.round_skip_previous_24, ACTION_PREVIOUS, previous_pendingIntent).build();

				/* On notification touch */
				Intent notification_intent = new Intent(getApplicationContext(), MainActivity.class);
				notification_intent.setAction("PLAYER_NOTIFICATION");
				notification_intent.putExtra("PLAYER_NOTIFICATION", "");
				Bundle notification_bundle = new Bundle();
				notification_bundle.putString("event", "PLAYER_NOTIFICATION");
				notification_intent.putExtras(notification_bundle);
				PendingIntent notification_pendingIntent;
				if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
					notification_pendingIntent = PendingIntent.getActivity(getApplicationContext(), 5, notification_intent, PendingIntent.FLAG_MUTABLE);
				} else {
					notification_pendingIntent = PendingIntent.getActivity(getApplicationContext(), 5, notification_intent, PendingIntent.FLAG_UPDATE_CURRENT);
				}

				Notification notification = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
						.setSmallIcon(R.drawable.play_circle)
						.setContentTitle(player_mediaMetadata.title)
						.setContentText(player_mediaMetadata.artist)
						.setLargeIcon(bitmap)
						.setContentIntent(notification_pendingIntent)
						.addAction(previous_action)
						.addAction(is_playing ? pause_action : play_action)
						.addAction(next_action)
						.addAction(stop_action)
						.setStyle(mediaStyle)
						.setColorized(true)
						.setUsesChronometer(true)
						.build();

				NotificationManagerCompat player_notification_manager = NotificationManagerCompat.from(getApplicationContext());
				if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
					/* Notification Manager. Creating notification channel */
					if(player_notification_manager.getNotificationChannelsCompat().size() == 0) {
						player_notification_manager.createNotificationChannel(notificationChannelCompat);
					}
				}

				/* Setting or updating notification */
				int NOTIFICATION_ID = 1;
				if(player_notification == null) {
					startForeground(NOTIFICATION_ID, notification);
					player_notification = notification;
				} else {
					player_notification = notification;
					player_notification_manager.notify(NOTIFICATION_ID, player_notification);
				}
			} catch (Exception ex) {
				if(ex.getMessage() != null) {
					ex.printStackTrace();
					Log.e("Notification error: ", ex.getMessage());
				} else {
					ex.printStackTrace();
					Log.e("Notification error: ", "Empty message");
				}
			}
		};
		if(!notification_thread_handler.isAlive()) {
			notification_thread_handler = new HandlerThread("NotificationThread");
			notification_thread_handler.start();
		}
		if(!notification_thread_handler2.isAlive()) {
			notification_thread_handler2 = new HandlerThread("NotificationThread2");
			notification_thread_handler2.start();
		}
		if(!notification_thread_handler3.isAlive()) {
			notification_thread_handler3 = new HandlerThread("NotificationThread3");
			notification_thread_handler3.start();
		}

		if(notification_thread_handler.isAlive()) {
			Handler handler = new Handler(notification_thread_handler.getLooper());
			handler.post(run);
			Log.d("Handler: ", "Handler 1");
			notification_thread_handler.quitSafely();
		} else if(notification_thread_handler2.isAlive()) {
			Handler handler = new Handler(notification_thread_handler2.getLooper());
			handler.post(run);
			notification_thread_handler2.quitSafely();
			Log.d("Handler: ", "Handler 2");
		} else if(notification_thread_handler3.isAlive()) {
			Handler handler = new Handler(notification_thread_handler3.getLooper());
			handler.post(run);
			notification_thread_handler3.quitSafely();
			Log.d("Handler: ", "Handler 3");
		} else {
			Handler handler = new Handler();
			handler.post(run);
			Log.d("Handler: ", "Handler main");
		}
	}

	@SuppressLint("VisibleForTests")
	@Override
	public void onCreate() {
		super.onCreate();

		mReactInstanceManager = MainApplication.getReactInstanceManager();

		// Get the ReactContext from the ReactInstanceManager
		mReactContext = mReactInstanceManager.getCurrentReactContext();

		Handler handler = new Handler(handlerThread.getLooper());

		handler.post(() -> {
			/* Player */
			if(exoPlayer == null) {
				DefaultRenderersFactory renderersFactory = new DefaultRenderersFactory(getApplicationContext()) {
					@NonNull
					@Override
					protected AudioSink buildAudioSink(Context context, boolean enableFloatOutput, boolean enableAudioTrackPlaybackParams, boolean enableOffload) {
						DefaultAudioSink.Builder builder = new DefaultAudioSink.Builder();
						builder.setAudioProcessors(new AudioProcessor[]{
								new TeeAudioProcessor(new TeeAudioProcessor.AudioBufferSink() {
									@Override
									public void flush(int sampleRateHz, int channelCount, @C.PcmEncoding int encoding) {
										//Log.w("DEBUG", "PCM configuration: sampleRateHz=" + sampleRateHz + ", channelCount=" + channelCount + ", encoding=" + encoding);
									}

									@Override
									public void handleBuffer(ByteBuffer buffer) {

									}
								})
						});
						return builder.build();
					}
				};
				DefaultExtractorsFactory extractorsFactory = new DefaultExtractorsFactory().setMp3ExtractorFlags(Mp3Extractor.FLAG_ENABLE_CONSTANT_BITRATE_SEEKING);
				exoPlayer = new ExoPlayer.Builder(getApplicationContext(), renderersFactory)
						.setMediaSourceFactory(new DefaultMediaSourceFactory(getApplicationContext(), extractorsFactory))
						.build();
				exoPlayer.setVolume(1);
				exoPlayer.setPlaybackSpeed(1);
				exoPlayer.addListener(new com.google.android.exoplayer2.Player.Listener() {
					@Override
					public void onIsPlayingChanged(boolean isPlaying) {
						com.google.android.exoplayer2.Player.Listener.super.onIsPlayingChanged(isPlaying);
						media_transition_handler.removeCallbacks(media_transition_runner);
						media_transition_runner = () -> {
							if (mediaSessionCompat != null) {
								mediaSessionCompat.setPlaybackState(
										new PlaybackStateCompat.Builder()
												.setState(
														isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
														exoPlayer.getCurrentPosition(),
														1
												)
												.setActions(PlaybackStateCompat.ACTION_SEEK_TO)
												.build()
								);
							}
							/* Notification */
							if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
								create_notification(exoPlayer.getMediaMetadata(), exoPlayer.getDuration(), exoPlayer.isPlaying());
							}
							/* Updating the UI */
							Bundle bundle = new Bundle();
							bundle.putString("event", "ON_PLAYING_STATE_CHANGE");
							bundle.putBoolean("is_playing", isPlaying);
							Intent intent = new Intent(getApplicationContext(), NativeBridgeService.class);
							intent.putExtras(bundle);
							getApplicationContext().startService(intent);

							player_position_handler.postDelayed(player_position_runner, 50);
							media_transition_handler.removeCallbacks(media_transition_runner);
						};
						media_transition_handler.postDelayed(media_transition_runner, 500);
					}

					@Override
					public void onPlaybackStateChanged(int playbackState) {
						com.google.android.exoplayer2.Player.Listener.super.onPlaybackStateChanged(playbackState);
						if (playbackState == exoPlayer.STATE_READY) {
							// Player is ready
							Bundle bundle = new Bundle();
							bundle.putString("event", "ON_READY");
							bundle.putDouble("position", exoPlayer.getCurrentPosition());
							bundle.putDouble("duration", exoPlayer.getDuration());
							bundle.putString("id", exoPlayer.getCurrentMediaItem() == null ? null : exoPlayer.getCurrentMediaItem().mediaId);
							Intent intent = new Intent(getApplicationContext(), NativeBridgeService.class);
							intent.putExtras(bundle);
							getApplicationContext().startService(intent);
						} else if (playbackState == exoPlayer.STATE_ENDED) {
							// Player has finished playing media
							Bundle bundle = new Bundle();
							bundle.putString("event", "ON_FINISHED");
							bundle.putDouble("position", exoPlayer.getCurrentPosition());
							bundle.putDouble("duration", exoPlayer.getDuration());
							bundle.putString("id", exoPlayer.getCurrentMediaItem() == null ? null : exoPlayer.getCurrentMediaItem().mediaId);
							Intent intent = new Intent(getApplicationContext(), NativeBridgeService.class);
							intent.putExtras(bundle);
							getApplicationContext().startService(intent);
						}
					}

					@Override
					public void onPositionDiscontinuity(@NonNull com.google.android.exoplayer2.Player.PositionInfo oldPosition, @NonNull com.google.android.exoplayer2.Player.PositionInfo newPosition, int reason) {
						com.google.android.exoplayer2.Player.Listener.super.onPositionDiscontinuity(oldPosition, newPosition, reason);
						if (mediaSessionCompat != null) {
							mediaSessionCompat.setPlaybackState(
									new PlaybackStateCompat.Builder()
											.setState(
													exoPlayer.isPlaying() ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
													exoPlayer.getCurrentPosition(),
													1
											)
											.setActions(PlaybackStateCompat.ACTION_SEEK_TO)
											.build()
							);
						}
					}

					@Override
					public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {
						com.google.android.exoplayer2.Player.Listener.super.onMediaItemTransition(mediaItem, reason);
						/* Updating the UI */
						Bundle bundle = new Bundle();
						bundle.putString("event", "ON_MEDIA_CHANGE");
						bundle.putInt("reason", reason);
						bundle.putDouble("position", exoPlayer.getCurrentPosition());
						bundle.putDouble("duration", exoPlayer.getDuration());
						bundle.putString("id", mediaItem == null ? null : mediaItem.mediaId);
						Intent intent = new Intent(getApplicationContext(), NativeBridgeService.class);
						intent.putExtras(bundle);
						getApplicationContext().startService(intent);

						media_transition_handler.removeCallbacks(media_transition_runner);
						media_transition_runner = () -> {
							if (mediaSessionCompat != null) {
								mediaSessionCompat.setPlaybackState(
										new PlaybackStateCompat.Builder()
												.setState(
														exoPlayer.isPlaying() ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
														exoPlayer.getCurrentPosition(),
														1
												)
												.setActions(PlaybackStateCompat.ACTION_SEEK_TO)
												.build()
								);
								/* Notification */
								if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
									create_notification(exoPlayer.getMediaMetadata(), exoPlayer.getDuration(), exoPlayer.isPlaying());
								}
							}
							media_transition_handler.removeCallbacks(media_transition_runner);
						};
						media_transition_handler.postDelayed(media_transition_runner, 500);
					}
				});
				/* Position Update */
				player_position_handler.removeCallbacks(player_position_runner);
				player_position_runner = () -> {
					if (exoPlayer != null) {
						/*Bundle bundle = new Bundle();
						bundle.putString("event", "CP");
						bundle.putDouble("p", exoPlayer.getCurrentPosition());
						bundle.putDouble("d", exoPlayer.getDuration());
						bundle.putString("id", exoPlayer.getCurrentMediaItem() == null ? null : exoPlayer.getCurrentMediaItem().mediaId);
						Intent intent = new Intent(getApplicationContext(), NativeBridgeService.class);
						intent.putExtras(bundle);
						getApplicationContext().startService(intent);*/
						JSONObject json = new JSONObject();
						try {
							json.put("event", "CURRENT_POSITION");
							json.put("position", exoPlayer.getCurrentPosition());
							json.put("duration", exoPlayer.getDuration());
							json.put("id", exoPlayer.getCurrentMediaItem() == null ? null : exoPlayer.getCurrentMediaItem().mediaId);
							com.znbox.beatlevels.modules.Player pm = mReactContext.getNativeModule(com.znbox.beatlevels.modules.Player.class);
							if (pm != null) {
								pm.sendData(json.toString());
							}
						} catch (JSONException e) {
							throw new RuntimeException(e);
						}
						player_position_handler.postDelayed(player_position_runner, 60);
					} else {
						/* Service has stopped */
						player_position_handler.removeCallbacks(player_position_runner);
					}
				};
				player_position_handler.postDelayed(player_position_runner, 0);
			}
		});
	}

	@Override
	public IBinder onBind(Intent intent) {
		// TODO: Return the communication channel to the service.
		// throw new UnsupportedOperationException("Not yet implemented");
		return null;
	}

	@Override
	public int onStartCommand(Intent intent, int flags, int startId) {
		Handler handler = new Handler(handlerThread.getLooper());
		if(!handlerThread.isAlive()) {
			return START_NOT_STICKY;
		}
		handler.post(() -> {
			try {

				final String ACTION = intent.getAction();

				switch (ACTION) {
					case "SET_MEDIA": {
						final String media_info_string = intent.getStringExtra("json");
						final JSONObject media_info = new JSONObject(media_info_string);
						final JSONArray media_queue = media_info.getJSONArray("queue");
						final int current_index = media_info.getInt("index");

						DataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(getApplicationContext());
						ArrayList <MediaSource> mediaSources = new ArrayList <MediaSource>();
						//ArrayList <MediaItem> mediaItems = new ArrayList<>();
						for(int i = 0; i < media_queue.length(); i ++) {
							final JSONObject media_item = media_queue.getJSONObject(i);

							final String media_id = media_item.getString("id");
							final boolean media_local = media_item.getBoolean("local");
							//final long media_duration = media_item.getLong("duration");
							final String media_uri = media_item.getString("uri");
							final String media_title = media_item.getString("title");
							final String media_artist = media_item.getString("artist");

							MediaItem mediaItem;
							MediaSource mediaSource;

							if(media_local) {
								/* If local file */
								File media_file = new File(media_uri);
								byte[] img;
								try (MediaMetadataRetriever metadataRetriever = new MediaMetadataRetriever()) {
									metadataRetriever.setDataSource(media_file.getAbsolutePath());
									img = metadataRetriever.getEmbeddedPicture();
									if (img == null) {
										@SuppressLint("UseCompatLoadingForDrawables") Bitmap bitmap = ((BitmapDrawable) getResources().getDrawable(R.drawable.default_note)).getBitmap();
										ByteArrayOutputStream stream = new ByteArrayOutputStream();
										bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream);
										img = stream.toByteArray();
									}
									metadataRetriever.release();
								}

								MediaMetadata.Builder builder = new MediaMetadata.Builder();
								builder.setTitle(media_title);
								builder.setArtist(media_artist);
								builder.setArtworkData(img, MediaMetadata.PICTURE_TYPE_FILE_ICON_OTHER);

								MediaMetadata mediaMetadata = builder.build();

								mediaItem = new MediaItem.Builder()
										.setMediaMetadata(mediaMetadata)
										.setUri(media_file.getAbsolutePath())
										.setMediaId(media_id)
										.build();
								mediaSource = new ProgressiveMediaSource.Factory(dataSourceFactory)
										.createMediaSource(mediaItem);
							} else {
								/* Remote files */
								@SuppressLint("UseCompatLoadingForDrawables") Bitmap bitmap = ((BitmapDrawable) getResources().getDrawable(R.drawable.default_note)).getBitmap();
								ByteArrayOutputStream stream = new ByteArrayOutputStream();
								bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream);
								byte[] img = stream.toByteArray();

								MediaMetadata.Builder builder = new MediaMetadata.Builder();
								builder.setTitle(media_title);
								builder.setArtist(media_artist);
								builder.setArtworkData(img, MediaMetadata.PICTURE_TYPE_FILE_ICON_OTHER);

								MediaMetadata mediaMetadata = builder.build();
								mediaItem = new MediaItem.Builder()
										.setMediaMetadata(mediaMetadata)
										.setUri(media_uri)
										.setMediaId(media_id)
										.build();
								mediaSource = new ProgressiveMediaSource.Factory(dataSourceFactory)
										.createMediaSource(mediaItem);
							}
							//mediaItems.add(mediaItem);
							mediaSources.add(mediaSource);
						}
						//exoPlayer.setMediaItems(mediaItems, current_index, 0);
						exoPlayer.setMediaSources(mediaSources, current_index, 0);
						exoPlayer.prepare();
						/* Notification */
						if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
							create_notification(exoPlayer.getMediaMetadata(), exoPlayer.getDuration(), exoPlayer.isPlaying());
						}
						break;
					}
					case "PLAY": {
						if(exoPlayer != null) {
							exoPlayer.play();
						}
						break;
					}
					case "PAUSE": {
						if(exoPlayer != null) {
							exoPlayer.pause();
						}
						break;
					}
					case "STOP": {
						if(exoPlayer != null) {
							stopSelf();
						}
						break;
					}
					case "NEXT": {
						if(exoPlayer != null) {
							exoPlayer.seekToNext();
						}
						break;
					}
					case "PREVIOUS": {
						if(exoPlayer != null) {
							exoPlayer.seekToPrevious();
						}
						break;
					}
					case "SEEK_FORWARD": {
						if(exoPlayer != null) {
							exoPlayer.seekForward();
						}
						break;
					}
					case "SEEK_BACK": {
						if(exoPlayer != null) {
							exoPlayer.seekBack();
						}
						break;
					}
					case "SEEK_TO": {
						if(exoPlayer != null) {
							long position = (long) intent.getDoubleExtra("position", 0);
							exoPlayer.seekTo(position);
							Bundle bundle = new Bundle();
							bundle.putString("event", "ON_SEEK_TO");
							bundle.putDouble("position", exoPlayer.getCurrentPosition());
							bundle.putDouble("duration", exoPlayer.getDuration());
							bundle.putString("id", exoPlayer.getCurrentMediaItem() == null ? null : exoPlayer.getCurrentMediaItem().mediaId);
							Intent seek_intent = new Intent(getApplicationContext(), NativeBridgeService.class);
							seek_intent.putExtras(bundle);
							getApplicationContext().startService(seek_intent);
						}
						break;
					}
					case "STATUS": {
						if(exoPlayer != null) {
							Bundle bundle = new Bundle();
							bundle.putDouble("position", exoPlayer.getCurrentPosition());
							bundle.putDouble("duration", exoPlayer.getDuration());
							bundle.putString("id", exoPlayer.getCurrentMediaItem() == null ? null : exoPlayer.getCurrentMediaItem().mediaId);
							ResultReceiver rr = intent.getParcelableExtra("result_receiver");
							rr.send(0, bundle);
						}
						break;
					}
					case "MOVE_MEDIA": {
						if(exoPlayer != null) {
							int from = intent.getIntExtra("from", 0);
							int to = intent.getIntExtra("to", 0);
							exoPlayer.moveMediaItem(from, to);
						}
						break;
					}
					case "REMOVE_MEDIA_ITEM": {
						if(exoPlayer != null) {
							int index = intent.getIntExtra("index", 0);
							exoPlayer.removeMediaItem(index);
						}
						break;
					}
					case "SEEK_TO_INDEX": {
						if(exoPlayer != null) {
							long position = (long) intent.getDoubleExtra("position", 0);
							int index = intent.getIntExtra("index", 0);
							exoPlayer.seekTo(index, position);
						}
						break;
					}
					case "SET_SHUFFLE": {
						if(exoPlayer != null) {
							String shuffle = intent.getStringExtra("shuffle");
							exoPlayer.setShuffleModeEnabled("shuffle".equals(shuffle));
						}
						break;
					}
					case "SET_REPEAT": {
						String repeat = intent.getStringExtra("repeat");
						switch (repeat) {
							case "repeat": {
								exoPlayer.setRepeatMode(exoPlayer.REPEAT_MODE_ALL);
								break;
							}
							case "repeat-current": {
								exoPlayer.setRepeatMode(exoPlayer.REPEAT_MODE_ONE);
								break;
							}
							default: {
								exoPlayer.setRepeatMode(exoPlayer.REPEAT_MODE_OFF);
								break;
							}
						}
						break;
					}
					default: {

						break;
					}
				}
			} catch (Exception ex) {
				ex.printStackTrace();
				if (ex.getMessage() != null) {
					Log.d("onStartCommand ERROR: ", ex.getMessage());
				}
			}
		});
        return START_NOT_STICKY;
	}

	@Override
	public void onDestroy() {
		if(handlerThread.isAlive()) {
			Handler handler = new Handler(handlerThread.getLooper());
			handler.post(() -> {
				if (exoPlayer != null) {
					exoPlayer.stop();
					exoPlayer.release();
					exoPlayer = null;
				}
				if(mediaSessionCompat != null) {
					mediaSessionCompat.release();
					mediaSessionCompat = null;
				}
				handlerThread.quitSafely();
			});
		} else {
			handlerThread = null;
		}
		if(notification_thread_handler.isAlive()) {
			notification_thread_handler.quitSafely();
		} else {
			notification_thread_handler = null;
		}
		if(notification_thread_handler2.isAlive()) {
			notification_thread_handler2.quitSafely();
		} else {
			notification_thread_handler2 = null;
		}
		if(notification_thread_handler3.isAlive()) {
			notification_thread_handler3.quitSafely();
		} else {
			notification_thread_handler3 = null;
		}
		super.onDestroy();
	}
}