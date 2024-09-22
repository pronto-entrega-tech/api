import sharp from "sharp";
const thumbhash = import("thumbhash");

export async function getThumbHash(path: string) {
  const { data, info } = await sharp(path)
    .resize({
      width: 100,
      height: 100,
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const binaryThumbHash = (await thumbhash).rgbaToThumbHash(
    info.width,
    info.height,
    data,
  );
  return Buffer.from(binaryThumbHash).toString("base64url");
}
