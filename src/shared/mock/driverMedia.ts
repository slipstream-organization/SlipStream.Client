/**
 * Driver media — mock until the backend serves it (GET /api/drivers/{code}/media).
 * `photos`: the photo carousel from the driver's page on formula1.com (Getty Images), 1600px wide,
 * in the site's order.
 */
export const DRIVER_PHOTOS: Record<string, { page: string; photos: string[] }> = {
  RUS: { page: 'george-russell', photos: [
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774585630/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268554779.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774596959/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268571554.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1772868369/trackside-images/2026/F1_Grand_Prix_Of_Australia___Qualifying/2265209242.jpg',
  ] },
  ANT: { page: 'kimi-antonelli', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774772166/trackside-images/2026/F1_Grand_Prix_Of_Japan/2268884816.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1771567931/trackside-images/2026/Formula_1_Testing_in_Bahrain___Day_2/2262577854.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1775723470/fom-website/2026/Japan/Antonelli%20Japan%20Saturday.png',
  ] },
  LEC: { page: 'charles-leclerc', photos: [
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774597570/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268572376.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1773479973/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266430502.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1771576248/trackside-images/2026/Formula_1_Testing_in_Bahrain___Day_3/2262590967.jpg',
  ] },
  HAM: { page: 'lewis-hamilton', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774599787/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268577899.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774667453/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268712083.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1770979444/trackside-images/2026/Formula_1_Testing_in_Bahrain___Day_3/2261401734.jpg',
  ] },
  NOR: { page: 'lando-norris', photos: [
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774686683/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268736648.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774498790/trackside-images/2026/F1_Grand_Prix_Of_Japan___Previews/2268386179.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1771500472/trackside-images/2026/Formula_1_Testing_in_Bahrain___Day_2/2262443438.jpg',
  ] },
  PIA: { page: 'oscar-piastri', photos: [
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1774687320/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268737809.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1774593263/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268566614.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1773479972/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266430496.jpg',
  ] },
  VER: { page: 'max-verstappen', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774681112/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268728198.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774679200/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268725259.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774772559/trackside-images/2026/F1_Grand_Prix_Of_Japan/2268885742.jpg',
  ] },
  HAD: { page: 'isack-hadjar', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774666538/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268710644.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1773466033/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266407902.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774504911/trackside-images/2026/F1_Grand_Prix_Of_Japan___Previews/2268393761.jpg',
  ] },
  LAW: { page: 'liam-lawson', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774494292/trackside-images/2026/F1_Grand_Prix_Of_Japan___Previews/2268380450.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1773474243/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266419901.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1773480658/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266431845.jpg',
  ] },
  LIN: { page: 'arvid-lindblad', photos: [
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1773557971/trackside-images/2026/F1_Grand_Prix_Of_China/2266576203.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1773475440/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266421433.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1774689454/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268740686.jpg',
  ] },
  ALO: { page: 'fernando-alonso', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774681317/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268728398.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1772870706/trackside-images/2026/F1_Grand_Prix_Of_Australia___Qualifying/2265212512.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774754395/trackside-images/2026/F1_Grand_Prix_Of_Japan/2268856846.jpg',
  ] },
  STR: { page: 'lance-stroll', photos: [
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774667042/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268711043.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1773396017/trackside-images/2026/F1_Grand_Prix_Of_China___Practice__Sprint_Qualifying/2266273831.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1773382321/trackside-images/2026/F1_Grand_Prix_Of_China___Practice__Sprint_Qualifying/2266244175.jpg',
  ] },
  ALB: { page: 'alexander-albon', photos: [
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1774772158/trackside-images/2026/F1_Grand_Prix_Of_Japan/2268884877.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774501691/trackside-images/2026/F1_Grand_Prix_Of_Japan___Previews/2268389856.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774687154/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268737626.jpg',
  ] },
  SAI: { page: 'carlos-sainz', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774767656/trackside-images/2026/F1_Grand_Prix_Of_Japan/2268874944.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1774687154/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268737625.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1774684859/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268733634.jpg',
  ] },
  HUL: { page: 'nico-hulkenberg', photos: [
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1774593083/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268566458.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774596192/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268570436.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1772867968/trackside-images/2026/F1_Grand_Prix_Of_Australia___Qualifying/2265208863.jpg',
  ] },
  BOR: { page: 'gabriel-bortoleto', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774681317/trackside-images/2026/F1_Grand_Prix_Of_Japan___Qualifying/2268728402.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1772696849/trackside-images/2026/F1_Grand_Prix_Of_Australia___Previews/2264876466.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774584186/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268552739.jpg',
  ] },
  GAS: { page: 'pierre-gasly', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1772947099/trackside-images/2026/F1_Grand_Prix_Of_Australia/2265359570.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774596979/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268571549.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1770888072/trackside-images/2026/Formula_1_Testing_in_Bahrain___Day_2/2261204473.jpg',
  ] },
  COL: { page: 'franco-colapinto', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774592919/trackside-images/2026/F1_Grand_Prix_Of_Japan___Practice/2268566310.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1773463416/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266404724.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1771491281/trackside-images/2026/Formula_1_Testing_in_Bahrain___Day_2/2262423826.jpg',
  ] },
  OCO: { page: 'esteban-ocon', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774768261/trackside-images/2026/F1_Grand_Prix_Of_Japan/2268876176.jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1772757984/fom-website/2026/Australia/GettyImages-2264863604.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774492960/trackside-images/2026/F1_Grand_Prix_Of_Japan___Previews/2268378497.jpg',
  ] },
  BEA: { page: 'oliver-bearman', photos: [
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1772779885/trackside-images/2026/F1_Grand_Prix_Of_Australia___Practice/2265040425.jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1772868394/trackside-images/2026/F1_Grand_Prix_Of_Australia___Qualifying/2265209293.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1773479973/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266430506.jpg',
  ] },
  PER: { page: 'sergio-perez', photos: [
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1773282408/trackside-images/2026/F1_Grand_Prix_Of_China___Previews/2266043167.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1756209682/fom-website/2025/Cadillac%20(GM)/TWGMS-F1-Announcement-1298%20(1)%20(1).jpg',
    'https://media.formula1.com/image/upload/t_16by9South/c_limit,w_1600/f_auto/q_auto/v1773473209/trackside-images/2026/F1_Grand_Prix_Of_China___Sprint__Qualifying/2266418217.jpg',
  ] },
  BOT: { page: 'valtteri-bottas', photos: [
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1756209682/fom-website/2025/Cadillac%20(GM)/TWGMS-F1-Announcement-1298%20(1)%20(1).jpg',
    'https://media.formula1.com/image/upload/t_16by9North/c_limit,w_1600/f_auto/q_auto/v1765275901/fom-website/2025/Cadillac%20(GM)/Untitled-10%20-%20Copy.jpg',
    'https://media.formula1.com/image/upload/t_16by9Centre/c_limit,w_1600/f_auto/q_auto/v1774772251/trackside-images/2026/F1_Grand_Prix_Of_Japan/2268885079.jpg',
  ] },
};
