// Supabase 连接。publishable key 本来就是公开的——它只能做 RLS 允许的事
//（cls_* 表全部要求 profiles.role = 'teacher'）。不要把 sb_secret_ 开头的钥匙放这里。
// 与 A-Level / SAT 站共用同一个项目，所以登录账号也是同一个。
window.CLASSROOM_CONFIG = {
  url: 'https://clhoyydlmojxshriuexw.supabase.co',
  anonKey: 'sb_publishable_vE4nLlR7k1OO3bs8z8gDWw_JEvKeKII',
  emailDomain: 'student.mathplatform.local',   // 用户名 → 内部邮箱，与其他站一致
};
