# -*- coding: utf-8 -*-
"""Python 版配乐混音（绕开 node spawn ffmpeg 的 EBUSY）。
用法: python lib/mix-bgm-py.py <期目录名(完整，位于 build/ 下)> [gain]
行为与 lib/mix-bgm.mjs 一致：说话段压到 speak*gain、停顿段 gap*gain、
rampSeconds 缓坡、尾部 tailFadeSeconds 淡出、bgm 循环；旧 final.mp4 先备份为 final-旧版.mp4。
"""
import subprocess, json, os, sys, math, shutil
from array import array

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000


def run(a):
    r = subprocess.run(a, capture_output=True)
    if r.returncode:
        raise SystemExit('FF 失败: ' + ' '.join(a[:2]) + ' :: ' + r.stderr.decode('utf-8', 'replace')[-400:])


def main():
    if len(sys.argv) < 2:
        print('用法: python lib/mix-bgm-py.py <期目录名> [gain]')
        sys.exit(2)
    ep = sys.argv[1]
    epdir = os.path.join(ROOT, 'build', ep)
    if not os.path.isdir(epdir):
        print('期目录不存在:', epdir)
        sys.exit(2)

    cfg = json.load(open(os.path.join(ROOT, 'config.json'), encoding='utf-8'))['bgm']
    gain = float(sys.argv[2]) if len(sys.argv) > 2 else float(cfg.get('gain', 0.5))
    speak, gap = float(cfg['speak']), float(cfg['gap'])
    ramp_s, tail_s = float(cfg['rampSeconds']), float(cfg['tailFadeSeconds'])

    master = os.path.join(epdir, 'work', 'out', 'master.mp4')
    if not os.path.isfile(master):
        print('master.mp4 不存在:', master)
        sys.exit(2)
    outdir = os.path.join(epdir, 'outputs')
    os.makedirs(outdir, exist_ok=True)
    final = os.path.join(outdir, 'final.mp4')
    bgm = os.path.join(ROOT, cfg['file'])
    if not os.path.isfile(bgm):
        print('无配乐文件（%s），跳过混音——final.mp4 保持不变' % bgm)
        sys.exit(0)

    # 旧成片备份（只备一次）
    if os.path.exists(final):
        bak = os.path.join(outdir, 'final-旧版.mp4')
        if not os.path.exists(bak):
            shutil.copy2(final, bak)
            print('已备份旧成片 ->', os.path.basename(bak))

    audiodir = os.path.join(epdir, 'work', 'audio')
    os.makedirs(audiodir, exist_ok=True)
    narr = os.path.join(audiodir, '_narration.f32')
    envp = os.path.join(audiodir, '_bgm-env.f32')

    bgmlen = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                   '-of', 'csv=p=0', bgm], capture_output=True, text=True).stdout.strip())
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', master, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', narr])

    pcm = array('f')
    pcm.fromfile(open(narr, 'rb'), os.path.getsize(narr) // 4)
    n = len(pcm)
    dur = n / SR
    win = SR // 100
    frames = math.ceil(n / win)
    spk = [0] * frames
    for f in range(frames):
        s = 0.0
        c = 0
        for i in range(f * win, min(n, (f + 1) * win)):
            s += pcm[i] * pcm[i]
            c += 1
        spk[f] = 1 if c and 10 * math.log10(s / c + 1e-12) > -38 else 0
    dil = [0] * frames
    pad = 12
    for f in range(frames):
        if spk[f]:
            for k in range(max(0, f - pad), min(frames - 1, f + pad) + 1):
                dil[k] = 1
    rampF = round(ramp_s * 100)
    target = [(speak if d else gap) * gain for d in dil]
    env = []
    for f in range(frames):
        lo, hi = max(0, f - rampF), min(frames - 1, f + rampF)
        env.append(sum(target[lo:hi + 1]) / (hi - lo + 1))
    out = array('f', [0.0]) * (n * 2)
    for i in range(n):
        t = i / SR
        v = env[min(frames - 1, i // win)]
        if t > dur - tail_s:
            v *= max(0.0, (dur - t) / tail_s)
        if t < 1.5:
            v *= t / 1.5
        out[i * 2] = v
        out[i * 2 + 1] = v
    out.tofile(open(envp, 'wb'))
    print('旁白 %.1fs | 说话占比 %.0f%% | gain %.2f (说话 %.3f / 间隙 %.3f)'
          % (dur, sum(dil) / frames * 100, gain, speak * gain, gap * gain))

    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', master, '-i', bgm,
         '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', envp, '-filter_complex',
         '[1:a]aformat=sample_fmts=fltp:sample_rates=%d:channel_layouts=stereo,atrim=0:%.3f,asetpts=N/SR/TB,'
         'aloop=loop=-1:size=%d,atrim=0:%.3f,asetpts=N/SR/TB[bgm];'
         '[bgm][2:a]amultiply[duck];'
         '[0:a]aformat=sample_fmts=fltp:sample_rates=%d:channel_layouts=stereo[v];'
         '[v][duck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]'
         % (SR, bgmlen, int(bgmlen * SR), dur, SR),
         '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', final])
    os.remove(narr)
    os.remove(envp)
    print('final:', final, os.path.getsize(final), '字节')


if __name__ == '__main__':
    main()
