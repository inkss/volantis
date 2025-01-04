/**
 * 右键音乐
 */
const RightMenuAplayer = (() => {
  let playStatus; // 播放器状态
  const APlayer = {}; // 右键音乐所控制的播放器
  const fn = {};

  fn.checkAPlayer = () => {
    if (playStatus === undefined || APlayer.player === undefined) {
      fn.setAPlayerObject();
    } else if (APlayer.observer === undefined) {
      fn.setAPlayerObserver();
    }
  };

  // 设置全局播放器所对应的 APlayer 对象
  fn.setAPlayerObject = () => {
    const metingElements = document.querySelectorAll('.footer meting-js, meting-js');
    APlayer.player = undefined;
    metingElements.forEach(item => {
      if (item.meta.id == volantis.GLOBAL_CONFIG.plugins.aplayer.id && item.aplayer && !APlayer.player) {
        APlayer.player = item.aplayer;
        fn.setAPlayerObserver();
        fn.updateTitle();
      }
    });
  };

  // 事件监听
  fn.setAPlayerObserver = () => {
    try {
      APlayer.player.on('play', () => {
        fn.updateAPlayerControllerStatus();
        APlayer.status = 'play';
      });
      APlayer.player.on('pause', () => {
        fn.updateAPlayerControllerStatus();
        APlayer.status = 'pause';
      });
      APlayer.player.on('volumechange', fn.onUpdateAPlayerVolume);
      APlayer.player.on('loadstart', fn.updateTitle);

      // 监听音量手势
      APlayer.volumeBarWrap = document.querySelector('.nav.volume').children[0];
      APlayer.volumeBar = APlayer.volumeBarWrap.children[0];

      const thumbMove = e => fn.updateAPlayerVolume(e);
      const thumbUp = e => {
        APlayer.volumeBarWrap.classList.remove('aplayer-volume-bar-wrap-active');
        document.removeEventListener('mouseup', thumbUp);
        document.removeEventListener('mousemove', thumbMove);
        fn.updateAPlayerVolume(e);
      };

      APlayer.volumeBarWrap.addEventListener('mousedown', event => {
        event.stopPropagation();
        APlayer.volumeBarWrap.classList.add('aplayer-volume-bar-wrap-active');
        document.addEventListener('mousemove', thumbMove);
        document.addEventListener('mouseup', thumbUp);
      });

      APlayer.volumeBarWrap.addEventListener('click', event => event.stopPropagation());

      fn.updateAPlayerControllerStatus();
      fn.onUpdateAPlayerVolume();
      APlayer.observer = true;
    } catch (error) {
      console.error(error);
      APlayer.observer = undefined;
    }
  };

  fn.updateAPlayerVolume = (e) => {
    let percentage = (e.clientX - APlayer.volumeBar.getBoundingClientRect().left) / APlayer.volumeBar.clientWidth;
    percentage = Math.max(0, Math.min(1, percentage));
    APlayer.player.volume(percentage);
  };

  fn.onUpdateAPlayerVolume = () => {
    try {
      APlayer.volumeBar.children[0].style.width = `${APlayer.player.audio.volume * 100}%`;
    } catch (error) {
      console.error(error);
    }
  };

  // 更新控制器状态
  fn.updateAPlayerControllerStatus = () => {
    try {
      const toggleIcon = document.querySelector('.nav.toggle').children[0];
      if (APlayer.player.audio.paused) {
        playStatus = 'pause';
        APlayer.status = 'pause';
        toggleIcon.classList.add('fa-play');
        toggleIcon.classList.remove('fa-pause');
      } else {
        playStatus = 'play';
        APlayer.status = 'play';
        toggleIcon.classList.remove('fa-play');
        toggleIcon.classList.add('fa-pause');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 播放/暂停
  fn.aplayerToggle = () => {
    fn.checkAPlayer();
    APlayer.player?.toggle();
  };

  // 上一曲
  fn.aplayerBackward = () => {
    fn.checkAPlayer();
    APlayer.player?.skipBack();
    APlayer.player?.play();
  };

  // 下一曲
  fn.aplayerForward = () => {
    fn.checkAPlayer();
    APlayer.player?.skipForward();
    APlayer.player?.play();
  };

  // 调节音量
  fn.aplayerVolume = (percent) => {
    fn.checkAPlayer();
    APlayer.player?.volume(percent);
  };

  // 更新音乐标题
  fn.updateTitle = () => {
    fn.checkAPlayer();
    try {
      const { index, audios } = APlayer.player.list;
      document.querySelector('.nav.music-title').innerHTML = audios[index].title;
    } catch (error) {
      console.error(error);
    }
  };

  return {
    checkAPlayer: fn.checkAPlayer,
    aplayerBackward: fn.aplayerBackward,
    aplayerToggle: fn.aplayerToggle,
    aplayerForward: fn.aplayerForward,
    aplayerVolume: fn.aplayerVolume,
    APlayer: APlayer
  };
})();

Object.freeze(RightMenuAplayer);

volantis.requestAnimationFrame(() => {
  RightMenuAplayer.checkAPlayer();
});
