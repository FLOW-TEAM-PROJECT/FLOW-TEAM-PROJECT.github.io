module.exports = {
  title: `TEAM FLOW 기술 블로그 🧑‍💻`,
  description: `개발계에 새로운 FLOW를 일으킬 FLOW 팀의 개발 과정을 기록합니다.`,
  language: `ko`, // `ko`, `en` => currently support versions for Korean and English
  siteUrl: `https://flow-team-project.github.io/`,
  ogImage: `/og-image.png`, // Path to your in the 'static' folder
  comments: {
    utterances: {
      repo: ``, // `zoomkoding/zoomkoding-gatsby-blog`,
    },
  },
  ga: '0', // Google Analytics Tracking ID
  author: {
    name: `FLOW`,
    bio: {
      role: `Team`,
      description: ['개발계에 새로운 Flow를 일으킬'],
      thumbnail: 'sample.png', // Path to the image in the 'asset' folder
    },
    social: {
      github: `https://github.com/FLOW-TEAM-PROJECT`, // `https://github.com/zoomKoding`,
      linkedIn: ``, // `https://www.linkedin.com/in/jinhyeok-jeong-800871192`,
      email: ``, // `zoomkoding@gmail.com`,
    },
  },

  // metadata for About Page
  about: {
    timestamps: [
      // =====       [Timestamp Sample and Structure]      =====
      // ===== 🚫 Don't erase this sample (여기 지우지 마세요!) =====
      {
        date: '',
        activity: '',
        links: {
          github: '',
          post: '',
          googlePlay: '',
          appStore: '',
          demo: '',
        },
      },
      // ========================================================
      // ========================================================
      {
        date: '2023.12.20 ~',
        activity: '팀 프로젝트 개발 과정을 기록합니다.',
        links: {
          github: 'https://github.com/FLOW-TEAM-PROJECT',
          post: '',
          googlePlay: '',
          appStore: '',
          demo: '',
        },
      },
    ],

    projects: [
      // =====        [Project Sample and Structure]        =====
      // ===== 🚫 Don't erase this sample (여기 지우지 마세요!)  =====
      {
        title: '',
        description: '',
        techStack: ['', ''],
        thumbnailUrl: '',
        links: {
          post: '',
          github: '',
          googlePlay: '',
          appStore: '',
          demo: '',
        },
      },
      // ========================================================
      // ========================================================
      {
        title: 'FLOW Backend',
        description: '개발자들을 위한 한국판 StackOverflow 커뮤니티 Backend 서버',
        techStack: ['Spring Boot', 'Java'],
        thumbnailUrl: '',
        links: {
          post: '',
          github: 'https://github.com/FLOW-TEAM-PROJECT/flow-server',
          googlePlay: '',
          appStore: '',
          demo: '',
        },
      },
    ],
  },
};
