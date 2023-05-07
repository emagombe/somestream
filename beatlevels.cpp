#define LOG_TAG "A_TAG"

#include <iostream>
#include <fstream>
#include "jni.h"
#include <android/log.h>
#include <vector>

extern "C" {
#include "libavformat/avformat.h"
#include "libavcodec/avcodec.h"
#include "libswresample/swresample.h"

#define AUDIO_INBUF_SIZE 20480
#define AUDIO_REFILL_THRESH 4096
#define TAG "AudioWaveform"

static void android_log_callback(void *avcl, int level, const char *fmt, va_list vl) {
    int android_level;
    switch (level) {
        case AV_LOG_DEBUG:
            android_level = ANDROID_LOG_DEBUG;
            break;
        case AV_LOG_INFO:
            android_level = ANDROID_LOG_INFO;
            break;
        case AV_LOG_WARNING:
            android_level = ANDROID_LOG_WARN;
            break;
        case AV_LOG_ERROR:
            android_level = ANDROID_LOG_ERROR;
            break;
        case AV_LOG_FATAL:
            android_level = ANDROID_LOG_FATAL;
            break;
        default:
            android_level = ANDROID_LOG_VERBOSE;
            break;
    }
    __android_log_vprint(android_level, "FFMPEG", fmt, vl);
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_com_znbox_beatlevels_modules_Waveform_decode_1to_1float(JNIEnv* env, jobject thiz, jstring filePath, jstring outputPath ) {
    av_log_set_level(AV_LOG_ERROR);
    av_log_set_callback(android_log_callback);

    const char *path = env->GetStringUTFChars(filePath, nullptr);
    const char *outpath = env->GetStringUTFChars(outputPath, nullptr);

    AVFormatContext *formatContext = avformat_alloc_context();
    if (!formatContext) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Could not allocate format context");
        env->ReleaseStringUTFChars(filePath, path);
        return nullptr;
    }
    int ret;
    if ((ret = avformat_open_input(&formatContext, path, nullptr, nullptr)) < 0) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Could not open file '%s'", path);
        av_log(NULL, AV_LOG_ERROR, "Error opening file: %s\n", av_err2str(ret));
        avformat_free_context(formatContext);
        env->ReleaseStringUTFChars(filePath, path);
        return nullptr;
    }
    if (avformat_find_stream_info(formatContext, nullptr) < 0) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Could not find stream information");
        avformat_close_input(&formatContext);
        avformat_free_context(formatContext);
        env->ReleaseStringUTFChars(filePath, path);
        return nullptr;
    }
    int streamIndex = -1;
    for (int i = 0; i < formatContext->nb_streams; i++) {
        if (formatContext->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_AUDIO) {
            streamIndex = i;
            break;
        }
    }
    if (streamIndex == -1) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Could not find audio stream");
        avformat_close_input(&formatContext);
        avformat_free_context(formatContext);
        env->ReleaseStringUTFChars(filePath, path);
        return nullptr;
    }
    AVCodecParameters *codecParams = formatContext->streams[streamIndex]->codecpar;
    const AVCodec *codec = avcodec_find_decoder(codecParams->codec_id);
    if (!codec) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Could not find codec");
        avformat_close_input(&formatContext);
        avformat_free_context(formatContext);
        env->ReleaseStringUTFChars(filePath, path);
        return nullptr;
    }
    AVCodecContext *codecContext = avcodec_alloc_context3(codec);
    if (!codecContext) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Could not allocate codec context");
        avcodec_free_context(&codecContext);
        avformat_close_input(&formatContext);
        avformat_free_context(formatContext);
        env->ReleaseStringUTFChars(filePath, path);
        return nullptr;
    }
    if (avcodec_parameters_to_context(codecContext, codecParams) < 0) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Could not copy codec parameters to context");
        avcodec_free_context(&codecContext);
        avformat_close_input(&formatContext);
        avformat_free_context(formatContext);
        env->ReleaseStringUTFChars(filePath, path);
        return nullptr;
    }
    AVFrame *frame = av_frame_alloc();
    if (avcodec_open2(codecContext, codec, nullptr) < 0) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Could not open codec");
        avformat_close_input(&formatContext);
        avcodec_free_context(&codecContext);
        av_frame_free(&frame);
        return nullptr;
    }

    AVPacket *packet = av_packet_alloc();

    SwrContext *resampler{swr_alloc_set_opts(
            nullptr,
            formatContext->streams[streamIndex]->codecpar->channel_layout,
            AV_SAMPLE_FMT_S16,
            1,
            formatContext->streams[streamIndex]->codecpar->channel_layout,
            (AVSampleFormat) formatContext->streams[streamIndex]->codecpar->format,
            formatContext->streams[streamIndex]->codecpar->format,
            1,
            0
    )};

    std::vector<float> waveform_floats;
    std::ofstream out(outpath, std::ios::binary);
    while (av_read_frame(formatContext, packet) >= 0) {
        if (packet->stream_index == streamIndex) {
            int result = avcodec_send_packet(codecContext, packet);
            if (result < 0) {
                av_packet_unref(packet);
                avformat_close_input(&formatContext);
                avcodec_free_context(&codecContext);
                av_frame_free(&frame);
                swr_free(&resampler);
                out.close();
                return nullptr;
            }

            while (result >= 0) {
                result = avcodec_receive_frame(codecContext, frame);
                if (result == AVERROR(EAGAIN) || result == AVERROR_EOF) {
                    break;
                }
                else if (result < 0) {
                    av_packet_unref(packet);
                    avformat_close_input(&formatContext);
                    avcodec_free_context(&codecContext);
                    av_frame_free(&frame);
                    swr_free(&resampler);
                    out.close();
                    return nullptr;
                }

                /*for (int i = 0; i < frame->nb_samples; i++) {
                    float sampleValue = frame->data[0][i] / (float)INT16_MAX;
                    int index = (int)(100 * ((double)frame->pts / (double)formatContext->duration));
                    if (index < 100) {
                        waveform[index] = sampleValue;
                    }
                }*/

                AVFrame *resampler_frame = av_frame_alloc();
                resampler_frame->sample_rate = 10;
                resampler_frame->ch_layout = frame->ch_layout;
                resampler_frame->format = AV_SAMPLE_FMT_S16;

                if(swr_convert_frame(resampler, resampler_frame, frame) >= 0) {
                    auto *samples = (int16_t *) frame->data[0];
                    for(int c = 0; c < resampler_frame->ch_layout.nb_channels; c ++) {
                        float sum = 0;
                        for(int i = 0; i < resampler_frame->nb_samples; i ++) {
                            if(samples[i * resampler_frame->ch_layout.nb_channels + c] < 0) {
                                sum += (float) samples[i * resampler_frame->ch_layout.nb_channels + c] * (-1);
                            } else {
                                sum += (float) samples[i * resampler_frame->ch_layout.nb_channels + c];
                            }
                            int average_point = (int) ((sum * 2) / (float) resampler_frame->nb_samples);
                            if(average_point > 0) {
                                //waveform_floats.push_back(average_point);
                                out << average_point << "\n";
                            }
                        }
                    }
                }

                av_frame_free(&resampler_frame);
                av_frame_unref(resampler_frame);
            }
        }
    }
    av_packet_unref(packet);
    av_packet_free(&packet);
    avformat_close_input(&formatContext);
    avformat_free_context(formatContext);
    swr_close(resampler);
    swr_free(&resampler);
    avcodec_close(codecContext);
    avcodec_free_context(&codecContext);
    av_frame_free(&frame);
    av_frame_unref(frame);
    clearenv();
    return nullptr;
}
};