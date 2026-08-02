type NavigatorWithUserAgentData = Pick<Navigator, "userAgent" | "platform"> & {
  userAgentData?: { platform?: string };
};

export function shouldUseGenericPhotoFilePicker(navigatorLike: NavigatorWithUserAgentData): boolean {
  const platform = navigatorLike.userAgentData?.platform ?? navigatorLike.platform;
  return /android/i.test(platform) || /android/i.test(navigatorLike.userAgent);
}
