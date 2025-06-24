// Mock API client for tests
export const apiClient = {
  request: jest.fn().mockResolvedValue({
    success: true,
    data: {
      image: 'data:image/png;base64,mockbase64data',
      video: 'https://example.com/video.mp4',
      audio: 'data:audio/mp3;base64,mockaudiodata',
      format: 'png',
      size: 1024,
      duration: 5,
    },
    credits: { used: 1, remaining: 100 },
  }),
  generateImage: jest.fn().mockResolvedValue({
    success: true,
    data: {
      image: 'data:image/png;base64,mockbase64data',
      format: 'png',
      size: 1024,
    },
    credits: { used: 1, remaining: 100 },
  }),
  getCredits: jest.fn().mockResolvedValue({
    remaining: 100,
    used: 50,
  }),
};