export default function SkeletonAvatar({size=58}){
  const style = {width: size, height: size};
  return <div className="skeleton skeleton--avatar" style={style} aria-hidden="true" />;
}
