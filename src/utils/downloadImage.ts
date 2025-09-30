export const downloadImage = async (imageUrl: string, filename: string = 'image') => {
  try {
    // CORS 문제를 해결하기 위해 fetch를 사용
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Blob을 URL로 변환
    const url = window.URL.createObjectURL(blob);
    
    // 다운로드를 위한 링크 생성
    const link = document.createElement('a');
    link.href = url;
    
    // 파일명 설정 (확장자 추가)
    const extension = imageUrl.includes('.jpg') ? '.jpg' : 
                     imageUrl.includes('.jpeg') ? '.jpeg' :
                     imageUrl.includes('.png') ? '.png' :
                     imageUrl.includes('.webp') ? '.webp' : '.jpg';
    
    link.download = `${filename}${extension}`;
    
    // 링크를 DOM에 추가하고 클릭
    document.body.appendChild(link);
    link.click();
    
    // 정리
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Image download failed:', error);
    // 대안: 새 탭에서 이미지 열기
    window.open(imageUrl, '_blank');
    return false;
  }
};