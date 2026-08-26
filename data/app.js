/* ============================================================================
   UlcerShield AI  -  SPA client
   Hash routing:  #/login  #/register  #/dashboard  #/profile  #/analysis
   ============================================================================ */
(() => {
  'use strict';

  // ------------------------------------------------------------
  // i18n (EN / AR / KO)
  // ------------------------------------------------------------
  const I18N = {
    en: {
      brand_subtitle: 'Bedsore Prevention Platform',
      conn_connecting: 'Connecting…', conn_connected: 'Live', conn_disconnected: 'Disconnected',
      sensor_offline: 'Sensor offline',
      nav_dashboard: 'Dashboard', nav_analysis: 'Analysis', nav_profile: 'Profile',
      logout: 'Logout',
      login_title: 'Sign in to UlcerShield AI',
      login_lede: 'Bedside monitoring and bedsore risk prediction.',
      register_title: 'Create your profile',
      register_lede: 'Add personal info, health metrics, and a photo.',
      username: 'Username', password: 'Password', full_name: 'Full name',
      email: 'Email', phone: 'Phone', age: 'Age', sex: 'Sex',
      height_cm: 'Height (cm)', weight_kg: 'Weight (kg)',
      height_cm_short: 'Ht', weight_kg_short: 'Wt',
      photo: 'Photo', tap_to_upload: 'Tap to upload',
      select: 'Select…', male: 'Male', female: 'Female', other: 'Other',
      notes: 'Clinical notes (optional)',
      btn_signin: 'Sign in', btn_create: 'Create account',
      cancel: 'Cancel', btn_save: 'Save changes', set_active: 'Monitor this patient',
      no_account: 'No account?', register_here: 'Register here',
      hero_title: 'Prevent pressure injuries before they happen.',
      hero_body: 'Continuous FSR pressure sensing, temperature and humidity monitoring, automatic turn detection, and AI-driven positioning recommendations.',
      hero_b1: 'Real-time zone pressure in N · mmHg · g',
      hero_b2: '2-hour repositioning timer with alerts',
      hero_b3: 'Per-patient history, export to CSV / PDF',
      patient_id: 'ID', status: 'Status',
      pressure_title: 'Pressure Zones', live: 'Live',
      zone_left: 'Left side', zone_right: 'Right side',
      fsr_a: 'FSR A · GPIO34', fsr_b: 'FSR B · GPIO35',
      no_load: 'NO LOAD',
      bodymap_title: 'Body Pressure Map', supine_view: 'Supine view',
      lg_safe: 'Safe < 32 mmHg', lg_elev: 'Elevated 32–60', lg_high: 'High 60–100', lg_crit: 'Critical > 100',
      lg_ref: 'Reference risk zones', lg_live: 'Live FSR sensors',
      occiput: 'Occiput', shoulder_l: 'Left shoulder', shoulder_r: 'Right shoulder',
      sacrum: 'Sacrum', heel_l: 'Left heel', heel_r: 'Right heel',
      vitals_title: 'Vitals', sensors: 'Sensors',
      body_temp: 'Body Temperature', humidity: 'Humidity', awaiting: 'Awaiting reading…',
      turns_title: 'Repositioning', fsr_derived: 'FSR-derived',
      min_since: 'min since turn', turns_counted: 'Turns detected',
      turn_target: 'Target (min)', occupancy: 'Occupancy',
      load_balance: 'Load balance (CoP)', left: 'Left', right: 'Right', balanced: 'Balanced',
      ai_title: 'UlcerShield AI Analysis', ai_ready: 'Ready',
      risk_note: 'Computed from pressure, immobility, moisture, temperature and asymmetry.',
      risk_pressure: 'Pressure', risk_immobility: 'Immobility',
      risk_moisture: 'Moisture', risk_temperature: 'Temperature', risk_asymmetry: 'Asymmetry',
      reco_title: 'Positioning Recommendations', reco_pill: 'Guidance',
      timeline_title: 'Event Timeline', clear: 'Clear',
      no_events: 'No events yet.',
      controls_title: 'Calibration & Controls',
      cal_hint: 'Place a known 1 kg mass on a rigid disc over each pad before running calibration.',
      btn_zero: 'Zero (unload both)', btn_cal_left: 'Calibrate Left', btn_cal_right: 'Calibrate Right', btn_reset: 'Reset counters',
      profile_title: 'Profile', profile_sub: 'Update personal info, health metrics and photo.',
      analysis_title: 'Analysis', analysis_sub: 'Historical trends, session summaries, and exports.',
      from: 'From', to: 'To', export_csv: 'Export CSV', export_pdf: 'Export PDF',
      kpi_samples: 'Samples', kpi_avg_p: 'Avg peak mmHg', kpi_max_p: 'Max mmHg',
      kpi_turns: 'Total turns', kpi_avg_risk: 'Avg risk', kpi_occ: 'Occupancy %',
      chart_pressure: 'Pressure over time', chart_risk: 'Risk score',
      chart_env: 'Body temperature & humidity', chart_cop: 'Center of Pressure',
      LOW: 'LOW', MODERATE: 'MODERATE', HIGH: 'HIGH', CRITICAL: 'CRITICAL',
      SAFE: 'SAFE', ELEVATED: 'ELEVATED', SATURATED: 'SATURATED',
      occ_yes: 'Occupied', occ_no: 'Empty',
      // events
      ev_turn: 'Repositioning detected', ev_calibration: 'Calibration',
      ev_reset: 'Counters reset', ev_connected: 'Sensor connected', ev_disconnected: 'Sensor disconnected',
      ev_active_user: 'Active patient set',
      // advice
      adv_ok: 'All indicators within safe range. Continue routine monitoring.',
      adv_reposition_now: 'REPOSITION NOW — 2 h limit exceeded.',
      adv_reposition_soon: 'Reposition due soon (within 30 min).',
      adv_high_p: 'Peak > 100 mmHg — offload this zone immediately.',
      adv_elev_p: 'Above capillary closing pressure — add cushion or redistribute load.',
      adv_saturated: 'FSR saturated — point load, not a valid pressure figure.',
      adv_humid: 'Humidity high — change or dry linen.',
      adv_temp_high: 'Skin temperature elevated — inspect skin for redness.',
      adv_temp_low: 'Low skin temperature — check perfusion.',
      adv_one_sided: 'Sustained one-sided loading — alternate side.',
      // positioning recommendations
      pos_default_t: '30° lateral tilt', pos_default_b: 'Alternate between supine, 30° left tilt, and 30° right tilt every 2 hours to distribute pressure.',
      pos_offload_l_t: 'Turn to the right', pos_offload_l_b: 'Pressure is concentrated on the LEFT side. Reposition to a 30° right-lateral tilt using pillows.',
      pos_offload_r_t: 'Turn to the left',  pos_offload_r_b: 'Pressure is concentrated on the RIGHT side. Reposition to a 30° left-lateral tilt using pillows.',
      pos_supine_t: 'Return to supine', pos_supine_b: 'Balanced load. Keep the head of bed below 30° to reduce shear on sacrum.',
      pos_heel_t: 'Offload heels', pos_heel_b: 'Place a pillow under the calves so heels are suspended free of the mattress.',
      pos_head_t: 'Head of bed', pos_head_b: 'Keep head of bed ≤ 30° whenever possible; higher angles increase sacral shear.',
      pos_hydrate_t: 'Skin care', pos_hydrate_b: 'Keep skin clean and dry. Apply barrier cream if humidity is high.',
      // toasts / titles
      toast_crit_t: 'Critical pressure', toast_reposition_t: 'Reposition required',
      toast_humid_t: 'Humidity alert', toast_temp_t: 'Temperature alert',
      toast_offline_t: 'Sensor offline',
      // AI panel
      ai_msg_intro: 'Analyzing sensor stream…',
    },
    ar: {
      brand_subtitle: 'منصة الوقاية من قرحة الفراش',
      conn_connecting: 'جارٍ الاتصال…', conn_connected: 'مباشر', conn_disconnected: 'غير متصل',
      sensor_offline: 'المستشعر غير متصل',
      nav_dashboard: 'لوحة القيادة', nav_analysis: 'التحليلات', nav_profile: 'الحساب',
      logout: 'تسجيل الخروج',
      login_title: 'تسجيل الدخول إلى UlcerShield AI',
      login_lede: 'مراقبة على السرير والتنبؤ بخطر قرحة الفراش.',
      register_title: 'إنشاء حساب',
      register_lede: 'أضف بياناتك الشخصية والصحية وصورة.',
      username: 'اسم المستخدم', password: 'كلمة المرور', full_name: 'الاسم الكامل',
      email: 'البريد الإلكتروني', phone: 'رقم الهاتف', age: 'العمر', sex: 'الجنس',
      height_cm: 'الطول (سم)', weight_kg: 'الوزن (كغ)',
      height_cm_short: 'الطول', weight_kg_short: 'الوزن',
      photo: 'الصورة', tap_to_upload: 'اضغط للرفع',
      select: 'اختر…', male: 'ذكر', female: 'أنثى', other: 'آخر',
      notes: 'ملاحظات سريرية (اختياري)',
      btn_signin: 'دخول', btn_create: 'إنشاء الحساب',
      cancel: 'إلغاء', btn_save: 'حفظ التغييرات', set_active: 'مراقبة هذا المريض',
      no_account: 'لا يوجد حساب؟', register_here: 'سجّل هنا',
      hero_title: 'امنع إصابات الضغط قبل حدوثها.',
      hero_body: 'استشعار مستمر للضغط عبر FSR ومراقبة الحرارة والرطوبة وكشف التقلب ونصائح ذكية للوضعية.',
      hero_b1: 'قراءة لحظية للضغط بوحدات N · mmHg · g',
      hero_b2: 'مؤقّت تقليب كل ساعتين مع تنبيهات',
      hero_b3: 'سجل تاريخي لكل مريض وتصدير CSV / PDF',
      patient_id: 'المعرّف', status: 'الحالة',
      pressure_title: 'مناطق الضغط', live: 'مباشر',
      zone_left: 'الجانب الأيسر', zone_right: 'الجانب الأيمن',
      fsr_a: 'FSR أ · GPIO34', fsr_b: 'FSR ب · GPIO35',
      no_load: 'لا حِمل',
      bodymap_title: 'خريطة ضغط الجسم', supine_view: 'وضعية الاستلقاء',
      lg_safe: 'آمن < 32', lg_elev: 'مرتفع 32-60', lg_high: 'عالٍ 60-100', lg_crit: 'حرج > 100',
      lg_ref: 'مناطق مرجعية', lg_live: 'مستشعرات FSR الحية',
      occiput: 'مؤخر الرأس', shoulder_l: 'الكتف الأيسر', shoulder_r: 'الكتف الأيمن',
      sacrum: 'العجز', heel_l: 'الكعب الأيسر', heel_r: 'الكعب الأيمن',
      vitals_title: 'العلامات الحيوية', sensors: 'المستشعرات',
      body_temp: 'حرارة الجسم', humidity: 'الرطوبة', awaiting: 'بانتظار القراءة…',
      turns_title: 'التقليب', fsr_derived: 'من FSR',
      min_since: 'دقيقة منذ آخر تقليب', turns_counted: 'مرات التقليب',
      turn_target: 'الهدف (دقيقة)', occupancy: 'الإشغال',
      load_balance: 'توزيع الحِمل (CoP)', left: 'يسار', right: 'يمين', balanced: 'متوازن',
      ai_title: 'تحليل UlcerShield AI', ai_ready: 'جاهز',
      risk_note: 'محسوب من الضغط، عدم الحركة، الرطوبة، الحرارة وعدم التوازن.',
      risk_pressure: 'الضغط', risk_immobility: 'عدم الحركة',
      risk_moisture: 'الرطوبة', risk_temperature: 'الحرارة', risk_asymmetry: 'عدم التوازن',
      reco_title: 'توصيات الوضعية', reco_pill: 'توصيات',
      timeline_title: 'سجل الأحداث', clear: 'مسح',
      no_events: 'لا أحداث بعد.',
      controls_title: 'المعايرة والتحكم',
      cal_hint: 'ضع كتلة 1 كغ معلومة على قرص صلب فوق كل وسادة قبل المعايرة.',
      btn_zero: 'تصفير', btn_cal_left: 'معايرة اليسار', btn_cal_right: 'معايرة اليمين', btn_reset: 'إعادة تعيين',
      profile_title: 'الحساب', profile_sub: 'تحديث البيانات الشخصية والقياسات الصحية والصورة.',
      analysis_title: 'التحليلات', analysis_sub: 'اتجاهات تاريخية وملخّصات الجلسات والتصدير.',
      from: 'من', to: 'إلى', export_csv: 'تصدير CSV', export_pdf: 'تصدير PDF',
      kpi_samples: 'عدد العينات', kpi_avg_p: 'متوسط ذروة الضغط', kpi_max_p: 'أقصى ضغط',
      kpi_turns: 'إجمالي التقليب', kpi_avg_risk: 'متوسط الخطر', kpi_occ: 'نسبة الإشغال',
      chart_pressure: 'الضغط عبر الزمن', chart_risk: 'مؤشر الخطر',
      chart_env: 'حرارة الجسم والرطوبة', chart_cop: 'مركز الضغط',
      LOW: 'منخفض', MODERATE: 'متوسط', HIGH: 'مرتفع', CRITICAL: 'حرج',
      SAFE: 'آمن', ELEVATED: 'مرتفع', SATURATED: 'مُشبع',
      occ_yes: 'مشغول', occ_no: 'فارغ',
      ev_turn: 'تم رصد تقليب', ev_calibration: 'معايرة',
      ev_reset: 'إعادة تعيين', ev_connected: 'اتصال المستشعر', ev_disconnected: 'انقطاع المستشعر',
      ev_active_user: 'تم تعيين المريض النشط',
      adv_ok: 'جميع المؤشرات ضمن النطاق الآمن.',
      adv_reposition_now: 'قلّب المريض الآن — تجاوزت مدة الساعتين.',
      adv_reposition_soon: 'التقليب مستحق قريباً (خلال 30 دقيقة).',
      adv_high_p: 'الذروة > 100 mmHg — خفّف الحِمل عن هذه المنطقة فوراً.',
      adv_elev_p: 'أعلى من ضغط إغلاق الشعيرات — أضف وسادة أو أعد التوزيع.',
      adv_saturated: 'المستشعر مُشبع — حِمل نقطي.',
      adv_humid: 'رطوبة عالية — غيّر أو جفّف الملاءات.',
      adv_temp_high: 'حرارة الجلد مرتفعة — افحص الجلد.',
      adv_temp_low: 'حرارة الجلد منخفضة — افحص التروية.',
      adv_one_sided: 'حِمل من جهة واحدة لفترة طويلة — بدّل الجهة.',
      pos_default_t: 'إمالة 30°', pos_default_b: 'بدّل بين الاستلقاء والإمالة 30° لليسار ثم لليمين كل ساعتين.',
      pos_offload_l_t: 'دوران إلى اليمين', pos_offload_l_b: 'الضغط مركّز على الجانب الأيسر. أَعِد الوضع إلى إمالة 30° يميناً باستخدام الوسائد.',
      pos_offload_r_t: 'دوران إلى اليسار', pos_offload_r_b: 'الضغط مركّز على الجانب الأيمن. أَعِد الوضع إلى إمالة 30° يساراً باستخدام الوسائد.',
      pos_supine_t: 'ارجع إلى الاستلقاء', pos_supine_b: 'الحِمل متوازن. حافظ على ميلان رأس السرير أقل من 30°.',
      pos_heel_t: 'رفع الكعبين', pos_heel_b: 'ضع وسادة تحت الساقين لرفع الكعبين عن الفراش.',
      pos_head_t: 'رأس السرير', pos_head_b: 'حافظ على رأس السرير ≤ 30° لتقليل قوى القص على العجز.',
      pos_hydrate_t: 'العناية بالجلد', pos_hydrate_b: 'حافظ على نظافة الجلد وجفافه. طبّق كريم واقٍ عند ارتفاع الرطوبة.',
      toast_crit_t: 'ضغط حرج', toast_reposition_t: 'يجب التقليب',
      toast_humid_t: 'تنبيه رطوبة', toast_temp_t: 'تنبيه حرارة',
      toast_offline_t: 'انقطاع المستشعر',
      ai_msg_intro: 'يتم تحليل بيانات المستشعرات…',
    },
    ko: {
      brand_subtitle: '욕창 예방 플랫폼',
      conn_connecting: '연결 중…', conn_connected: '실시간', conn_disconnected: '연결 끊김',
      sensor_offline: '센서 오프라인',
      nav_dashboard: '대시보드', nav_analysis: '분석', nav_profile: '프로필',
      logout: '로그아웃',
      login_title: 'UlcerShield AI 로그인',
      login_lede: '침상 모니터링 및 욕창 위험 예측.',
      register_title: '프로필 만들기',
      register_lede: '개인 정보, 건강 지표, 사진을 추가하세요.',
      username: '아이디', password: '비밀번호', full_name: '이름',
      email: '이메일', phone: '전화번호', age: '나이', sex: '성별',
      height_cm: '키 (cm)', weight_kg: '체중 (kg)',
      height_cm_short: '키', weight_kg_short: '체중',
      photo: '사진', tap_to_upload: '탭하여 업로드',
      select: '선택…', male: '남성', female: '여성', other: '기타',
      notes: '임상 메모 (선택)',
      btn_signin: '로그인', btn_create: '계정 생성',
      cancel: '취소', btn_save: '변경 사항 저장', set_active: '이 환자 모니터링',
      no_account: '계정이 없으신가요?', register_here: '여기서 가입',
      hero_title: '욕창 발생을 사전에 예방하세요.',
      hero_body: '지속적 FSR 압력 감지, 온도·습도 모니터링, 자동 자세 변경 감지, AI 자세 권장.',
      hero_b1: '실시간 압력 표시 (N · mmHg · g)',
      hero_b2: '2시간 자세 변경 알림',
      hero_b3: '환자별 이력, CSV / PDF 내보내기',
      patient_id: 'ID', status: '상태',
      pressure_title: '압력 영역', live: '실시간',
      zone_left: '왼쪽', zone_right: '오른쪽',
      fsr_a: 'FSR A · GPIO34', fsr_b: 'FSR B · GPIO35',
      no_load: '하중 없음',
      bodymap_title: '신체 압력 지도', supine_view: '앙와위',
      lg_safe: '안전 < 32', lg_elev: '상승 32-60', lg_high: '높음 60-100', lg_crit: '위험 > 100',
      lg_ref: '참조 위험 영역', lg_live: '실시간 FSR 센서',
      occiput: '후두부', shoulder_l: '왼쪽 어깨', shoulder_r: '오른쪽 어깨',
      sacrum: '천골', heel_l: '왼쪽 발뒤꿈치', heel_r: '오른쪽 발뒤꿈치',
      vitals_title: '생체 신호', sensors: '센서',
      body_temp: '체온', humidity: '습도', awaiting: '측정 대기 중…',
      turns_title: '자세 변경', fsr_derived: 'FSR 기반',
      min_since: '마지막 자세 변경 이후 분', turns_counted: '감지된 자세 변경',
      turn_target: '목표 (분)', occupancy: '점유',
      load_balance: '하중 균형 (CoP)', left: '좌', right: '우', balanced: '균형',
      ai_title: 'UlcerShield AI 분석', ai_ready: '준비',
      risk_note: '압력, 부동, 습도, 온도, 비대칭을 기반으로 계산됨.',
      risk_pressure: '압력', risk_immobility: '부동',
      risk_moisture: '습도', risk_temperature: '온도', risk_asymmetry: '비대칭',
      reco_title: '자세 권장 사항', reco_pill: '권장',
      timeline_title: '이벤트 타임라인', clear: '지우기',
      no_events: '이벤트 없음.',
      controls_title: '캘리브레이션 및 제어',
      cal_hint: '캘리브레이션 전에 각 패드 위 강체 디스크에 1kg 질량을 올리세요.',
      btn_zero: '영점 조정', btn_cal_left: '좌측 보정', btn_cal_right: '우측 보정', btn_reset: '카운터 초기화',
      profile_title: '프로필', profile_sub: '개인 정보, 건강 지표, 사진을 업데이트하세요.',
      analysis_title: '분석', analysis_sub: '이력 추세, 세션 요약 및 내보내기.',
      from: '시작', to: '종료', export_csv: 'CSV 내보내기', export_pdf: 'PDF 내보내기',
      kpi_samples: '샘플 수', kpi_avg_p: '평균 최고 mmHg', kpi_max_p: '최고 mmHg',
      kpi_turns: '총 자세 변경', kpi_avg_risk: '평균 위험도', kpi_occ: '점유율 %',
      chart_pressure: '시간 경과 압력', chart_risk: '위험 점수',
      chart_env: '체온 및 습도', chart_cop: '압력 중심',
      LOW: '낮음', MODERATE: '중간', HIGH: '높음', CRITICAL: '위험',
      SAFE: '안전', ELEVATED: '상승', SATURATED: '포화',
      occ_yes: '점유됨', occ_no: '비어 있음',
      ev_turn: '자세 변경 감지', ev_calibration: '보정',
      ev_reset: '카운터 초기화', ev_connected: '센서 연결', ev_disconnected: '센서 연결 끊김',
      ev_active_user: '활성 환자 설정',
      adv_ok: '모든 지표가 안전 범위 내에 있습니다.',
      adv_reposition_now: '지금 자세 변경 — 2시간 한도 초과.',
      adv_reposition_soon: '곧 자세 변경 필요 (30분 이내).',
      adv_high_p: '최고 > 100 mmHg — 즉시 이 영역의 하중을 줄이세요.',
      adv_elev_p: '모세관 폐쇄 압력 초과 — 쿠션 추가 또는 재분배.',
      adv_saturated: 'FSR 포화 — 점 하중.',
      adv_humid: '습도 높음 — 침구 교체 또는 건조.',
      adv_temp_high: '피부 온도 상승 — 피부 발적 확인.',
      adv_temp_low: '피부 온도 낮음 — 관류 확인.',
      adv_one_sided: '한쪽 편중 지속 — 반대쪽으로 교대.',
      pos_default_t: '30° 측방 기울기', pos_default_b: '2시간마다 앙와위, 좌측 30°, 우측 30°로 교대하여 압력을 분산하세요.',
      pos_offload_l_t: '오른쪽으로 돌리기', pos_offload_l_b: '압력이 왼쪽에 집중됩니다. 베개를 이용해 우측 30° 기울기로 자세를 변경하세요.',
      pos_offload_r_t: '왼쪽으로 돌리기', pos_offload_r_b: '압력이 오른쪽에 집중됩니다. 베개를 이용해 좌측 30° 기울기로 자세를 변경하세요.',
      pos_supine_t: '앙와위로 복귀', pos_supine_b: '하중 균형. 침대 머리를 30° 이하로 유지하세요.',
      pos_heel_t: '발뒤꿈치 하중 해제', pos_heel_b: '종아리 아래에 베개를 놓아 발뒤꿈치가 매트리스에서 뜨도록 하세요.',
      pos_head_t: '침대 머리 각도', pos_head_b: '가능한 한 침대 머리를 30° 이하로 유지하세요.',
      pos_hydrate_t: '피부 관리', pos_hydrate_b: '피부를 청결하고 건조하게 유지하세요. 습도가 높으면 보호 크림을 바르세요.',
      toast_crit_t: '위험 압력', toast_reposition_t: '자세 변경 필요',
      toast_humid_t: '습도 경보', toast_temp_t: '온도 경보',
      toast_offline_t: '센서 오프라인',
      ai_msg_intro: '센서 스트림 분석 중…',
    }
  };

  const LANG_ORDER = ['en', 'ar', 'ko'];
  const LANG_LABEL = { en: 'عربي', ar: '한국어', ko: 'English' };

  let lang     = localStorage.getItem('us_lang')  || (navigator.language.startsWith('ar') ? 'ar' : navigator.language.startsWith('ko') ? 'ko' : 'en');
  let theme    = localStorage.getItem('us_theme') || 'light';
  let fontSize = localStorage.getItem('us_fs')    || 'm';
  let currentConnState = 'connecting';   // updated by setConnState(); re-applied after any applyI18n() so translations stay in sync
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;

  function applyI18n(root) {
    document.documentElement.lang = lang;
    document.documentElement.dir  = (lang === 'ar') ? 'rtl' : 'ltr';
    (root || document).querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    const langLabel = $('langLabel'); if (langLabel) langLabel.textContent = LANG_LABEL[lang];
    // Preserve dynamic bits that applyI18n would otherwise overwrite.
    setConnState(currentConnState);
  }
  function applyFontSize() {
    document.documentElement.dataset.fontsize = fontSize;
    const l = $('fontLabel'); if (l) l.textContent = { s:'S', m:'M', l:'L', xl:'XL' }[fontSize];
  }
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
  }

  // ------------------------------------------------------------
  // small utils
  // ------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => (root || document).querySelectorAll(sel);
  const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '--');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function fetchJSON(url, opts) {
    return fetch(url, opts).then(r => r.json().catch(() => ({})).then(j => ({ ok: r.ok, status: r.status, body: j })));
  }
  function download(name, mime, data) {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }
  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString([], { year:'numeric', month:'short', day:'2-digit' });
  }
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }

  // ------------------------------------------------------------
  // Toast system
  // ------------------------------------------------------------
  const TOAST_ICONS = {
    info:   '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="M11 10h2v7h-2zM11 6h2v2h-2z"/></svg>',
    warn:   '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2 1 22h22Zm0 6 8 14H4Zm-1 6h2v4h-2zm0 5h2v2h-2z"/></svg>',
    danger: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="currentColor"/><path fill="#fff" d="M11 6h2v8h-2zm0 10h2v2h-2z"/></svg>',
    ok:     '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="m10 16-4-4 1.4-1.4L10 13.2l6.6-6.6L18 8Z"/></svg>',
  };
  const toastKeys = new Map();          // dedupe recent toasts by key -> lastAt
  function toast({ sev='info', title, body, key, ttl=5000, force=false }) {
    if (key) {
      const now = Date.now();
      if (!force && toastKeys.has(key) && now - toastKeys.get(key) < 30000) return;
      toastKeys.set(key, now);
    }
    const host = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.dataset.sev = sev;
    el.innerHTML =
      `<div class="toast__icon">${TOAST_ICONS[sev] || TOAST_ICONS.info}</div>
       <div>
         <div class="toast__title"></div>
         <div class="toast__body"></div>
       </div>
       <button class="toast__close" aria-label="Close">×</button>`;
    el.querySelector('.toast__title').textContent = title || '';
    el.querySelector('.toast__body').textContent  = body  || '';
    host.appendChild(el);
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
    el.querySelector('.toast__close').addEventListener('click', close);
    if (ttl > 0) setTimeout(close, ttl);
    if (sev === 'danger' && 'vibrate' in navigator) navigator.vibrate([200, 80, 200]);
  }

  // ------------------------------------------------------------
  // Session (client-side)
  // ------------------------------------------------------------
  const SESSION_KEY = 'us_session_v1';
  const getSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } };
  const setSession = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  const clearSession = () => localStorage.removeItem(SESSION_KEY);

  function updateHeaderForSession() {
    const s = getSession();
    const nav = $('mainNav'), chip = $('userChip');
    if (s) {
      nav.hidden = false; chip.hidden = false;
      $('userChipName').textContent = s.name || s.username;
      $('userChipAvatar').src = s.avatar || 'logo.jpeg';
    } else {
      nav.hidden = true; chip.hidden = true;
    }
    $$('#mainNav a').forEach(a => {
      const active = location.hash === '#' + a.dataset.route;
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  // ------------------------------------------------------------
  // Router
  // ------------------------------------------------------------
  const routes = {
    '/login':     renderLogin,
    '/register':  renderRegister,
    '/dashboard': renderDashboard,
    '/profile':   renderProfile,
    '/analysis':  renderAnalysis,
  };
  function navigate() {
    const hash = location.hash.replace(/^#/, '') || '/login';
    const path = routes[hash] ? hash : (getSession() ? '/dashboard' : '/login');
    const authRequired = ['/dashboard', '/profile', '/analysis'].includes(path);
    if (authRequired && !getSession()) { location.hash = '/login'; return; }
    if (!authRequired && getSession() && (path === '/login' || path === '/register')) { location.hash = '/dashboard'; return; }
    // clean up analysis timer if leaving the analysis view
    if (path !== '/analysis' && analysisTimer) { clearInterval(analysisTimer); analysisTimer = null; }
    routes[path]();
    updateHeaderForSession();
    applyI18n();
  }
  window.addEventListener('hashchange', navigate);

  // ------------------------------------------------------------
  // View rendering helpers
  // ------------------------------------------------------------
  function mount(tplId) {
    const tpl = $(tplId);
    const view = $('view');
    view.innerHTML = '';
    view.appendChild(tpl.content.cloneNode(true));
  }

  function readFileAsDataURL(file, maxSide = 160) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  // ------------------------------------------------------------
  // LOGIN view
  // ------------------------------------------------------------
  function renderLogin() {
    mount('tpl-login');
    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const r = await fetchJSON('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: f.get('username'), password: f.get('password') }),
      });
      if (!r.ok) { toast({ sev:'danger', title: t('login_title'), body: r.body.error || 'Invalid credentials' }); return; }
      setSession(r.body);
      toast({ sev:'ok', title: t('login_title'), body: r.body.name || r.body.username });
      await autoSetActivePatient(r.body);
      location.hash = '/dashboard';
    });
  }

  // ------------------------------------------------------------
  // REGISTER view
  // ------------------------------------------------------------
  function renderRegister() {
    mount('tpl-register');
    let avatarData = '';
    $('avatarInput').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      avatarData = await readFileAsDataURL(f, 160);
      $('avatarPreview').src = avatarData;
    });
    $('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      body.avatar = avatarData;
      body.role   = 'patient';
      const r = await fetchJSON('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { toast({ sev:'danger', title: t('register_title'), body: r.body.error || 'Failed' }); return; }
      toast({ sev:'ok', title: t('register_title'), body: t('login_title') });
      // Auto-login
      const login = await fetchJSON('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: body.username, password: body.password }),
      });
      if (login.ok) {
        setSession(login.body);
        await autoSetActivePatient(login.body);
        location.hash = '/dashboard';
      } else location.hash = '/login';
    });
  }

  async function autoSetActivePatient(user) {
    // Sensor data logs on the ESP32 to the "active" patient. Make sure that's
    // set to the user who just logged in so their analysis tab shows data.
    try {
      const cur = await fetchJSON('/api/active');
      const alreadyMe = cur.ok && cur.body && cur.body.id === user.id;
      if (!alreadyMe) {
        await fetchJSON('/api/active', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, name: user.name || user.username }),
        });
      }
    } catch (e) { console.warn('autoSetActivePatient failed', e); }
  }

  // ------------------------------------------------------------
  // DASHBOARD view
  // ------------------------------------------------------------
  let dash = {}; // dashboard DOM refs
  function renderDashboard() {
    mount('tpl-dashboard');
    dash = {
      leftN:$('leftN'), leftMmhg:$('leftMmhg'), leftG:$('leftG'), leftFill:$('leftFill'),
      leftPeak:$('leftPeak'), leftBadge:$('leftBadge'),
      rightN:$('rightN'), rightMmhg:$('rightMmhg'), rightG:$('rightG'), rightFill:$('rightFill'),
      rightPeak:$('rightPeak'), rightBadge:$('rightBadge'),
      fsrDotL:$('fsrDotL'), fsrDotR:$('fsrDotR'),
      bodyTemp:$('bodyTemp'), humidity:$('humidity'),
      bodyStatus:$('bodyStatus'), humStatus:$('humStatus'),
      vitalBody:$('vitalBody'), vitalHum:$('vitalHum'),
      sinceTurn:$('sinceTurn'), turnCount:$('turnCount'), ringFg:$('ringFg'),
      occStat:$('occStat'), copValue:$('copValue'), copMarker:$('copMarker'),
      riskScore:$('riskScore'), riskFill:$('riskFill'),
      patientRisk:$('patientRisk'), patientRiskLabel:$('patientRiskLabel'),
      rp:$('rp'), rt:$('rt'), rm:$('rm'), rtemp:$('rtemp'),
      recoList:$('recoList'),
      aiMessages:$('aiMessages'), aiState:$('aiState'),
      timeline:$('timeline'),
      patientName:$('patient-h'), patientAvatar:$('patientAvatar'),
      patientId:$('patientId'), patientAge:$('patientAge'),
      patientSex:$('patientSex'), patientHt:$('patientHt'), patientWt:$('patientWt'),
    };
    dash.RING_C = 2 * Math.PI * 52;
    dash.ringFg.style.strokeDasharray = dash.RING_C.toFixed(1);
    // paint patient card from session
    paintPatientCard();

    // wire calibration buttons
    $$('[data-cmd]').forEach(btn => btn.addEventListener('click', () => sendCmd(btn.dataset.cmd)));
    $('clearTimeline').addEventListener('click', () => {
      dash.timeline.innerHTML = '';
      hasEvents = false;
      const li = document.createElement('li');
      li.className = 'timeline__empty'; li.textContent = t('no_events');
      dash.timeline.appendChild(li);
    });

    // seed AI intro
    aiSay('info', t('ai_msg_intro'));
    renderRecommendations({ cop: 0, occupied: false, left: { mmhg: 0 }, right: { mmhg: 0 } });

    // if we have a lastState buffer, render it now
    if (lastState) applyState(lastState);
  }

  function paintPatientCard() {
    const s = getSession(); if (!s || !dash.patientName) return;
    dash.patientName.textContent = s.name || s.username || '—';
    dash.patientAvatar.src = s.avatar || 'logo.jpeg';
    dash.patientId.textContent  = s.id || '—';
    dash.patientAge.textContent = s.age || '—';
    dash.patientSex.textContent = s.sex || '—';
    dash.patientHt.textContent  = s.height || '—';
    dash.patientWt.textContent  = s.weight || '—';
  }

  // ------------------------------------------------------------
  // Dashboard: state rendering
  // ------------------------------------------------------------
  function pressureStatus(mmhg, sat) {
    if (sat) return 'sat';
    if (mmhg < 8)   return 'idle';
    if (mmhg < 32)  return 'safe';
    if (mmhg < 60)  return 'elev';
    if (mmhg < 100) return 'high';
    return 'crit';
  }
  function pressureLabelI18n(mmhg, sat) {
    if (sat) return t('SATURATED');
    if (mmhg < 8)   return t('no_load');
    if (mmhg < 32)  return t('SAFE');
    if (mmhg < 60)  return t('ELEVATED');
    if (mmhg < 100) return t('HIGH');
    return t('CRITICAL');
  }
  function riskLevel(score) {
    if (score < 25) return 'low';
    if (score < 50) return 'moderate';
    if (score < 75) return 'high';
    return 'critical';
  }

  function renderZone(prefix, z) {
    dash[prefix + 'N'].textContent    = fmt(z.n, 2);
    dash[prefix + 'Mmhg'].textContent = fmt(z.mmhg, 1);
    dash[prefix + 'G'].textContent    = fmt(z.g, 1);
    dash[prefix + 'Peak'].textContent = 'peak ' + fmt(z.peak, 1);
    const pct = clamp(z.mmhg / 150 * 100, 0, 100);
    dash[prefix + 'Fill'].style.width = pct + '%';
    const status = pressureStatus(z.mmhg, z.sat);
    const badge  = dash[prefix + 'Badge'];
    badge.dataset.status = status;
    badge.textContent = pressureLabelI18n(z.mmhg, z.sat);
  }

  function renderBodyMap(left, right) {
    const svg = $('bodymapSvg'); if (!svg) return;
    const spots = svg.querySelectorAll('.pspot');
    spots.forEach(g => {
      const side   = g.dataset.side;                       // 'left' | 'right'
      const w      = parseFloat(g.dataset.weight) || 1;
      const src    = side === 'left' ? left : right;
      const eff    = (src.mmhg || 0) * w;                  // effective distributed mmHg
      const sat    = src.sat && w >= 0.9;                  // only primary hip inherits SAT flag
      const status = pressureStatus(eff, sat);
      g.setAttribute('class', 'pspot st-' + status);
      // scale glow radius with magnitude (base + up to +6px at 100 mmHg effective)
      const dot  = g.querySelector('.pspot__dot');
      const glow = g.querySelector('.pspot__glow');
      const baseD = parseFloat(dot.getAttribute('r'));
      const baseG = parseFloat(glow.getAttribute('r'));
      if (!g.dataset.baseD) { g.dataset.baseD = baseD; g.dataset.baseG = baseG; }
      const mag = clamp(eff / 100, 0, 1);
      dot.setAttribute('r',  (parseFloat(g.dataset.baseD) + mag * 3).toFixed(1));
      glow.setAttribute('r', (parseFloat(g.dataset.baseG) + mag * 8).toFixed(1));
      g.querySelector('title')?.remove();
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      const label = (side === 'left' ? 'L' : 'R') + ' ' + g.dataset.region + ': ' + eff.toFixed(0) + ' mmHg';
      title.textContent = label;
      g.appendChild(title);
    });
  }

  function renderVitals(s) {
    if (s.body_ok) {
      dash.bodyTemp.textContent = fmt(s.body_c, 2);
      dash.vitalBody.dataset.state = 'ok';
      dash.bodyStatus.textContent =
        (s.body_c > 37.5) ? t('adv_temp_high')
        : (s.body_c < 33 && s.body_c > 28 && s.occupied) ? t('adv_temp_low')
        : 'MLX90614 · °C';
    } else {
      dash.bodyTemp.textContent = '--';
      dash.vitalBody.dataset.state = 'error';
      dash.bodyStatus.textContent = 'MLX90614 — no data';
    }
    if (s.humidity_ok) {
      dash.humidity.textContent = fmt(s.humidity, 1);
      dash.vitalHum.dataset.state = 'ok';
      dash.humStatus.textContent = s.humidity > 65 ? t('adv_humid') : 'DHT22 · %';
    } else {
      dash.humidity.textContent = '--';
      dash.vitalHum.dataset.state = 'error';
      dash.humStatus.textContent = 'DHT22 — no data';
    }
  }

  function renderTurns(s) {
    const mins = s.since_turn_min || 0;
    const target = s.turn_target_min || 120;
    dash.sinceTurn.textContent = mins.toFixed(0);
    dash.turnCount.textContent = s.turns || 0;
    dash.occStat.textContent = s.occupied ? t('occ_yes') : t('occ_no');
    const pct = clamp(mins / target, 0, 1);
    dash.ringFg.style.strokeDashoffset = (dash.RING_C * (1 - pct)).toFixed(1);
    dash.ringFg.style.stroke = pct >= 1 ? '#ef4444' : (pct > 0.75 ? '#f59e0b' : 'url(#ringG)');
    const cop = s.cop || 0;
    dash.copValue.textContent = (cop >= 0 ? '+' : '') + cop.toFixed(2);
    const pos = clamp((cop + 1) / 2 * 100, 0, 100);
    dash.copMarker.style.insetInlineStart = pos + '%';
    dash.copMarker.style.borderColor =
      Math.abs(cop) > 0.6 ? '#ef4444'
      : Math.abs(cop) > 0.35 ? '#f59e0b' : 'var(--c-primary)';
  }

  function renderRisk(s) {
    const score = s.risk | 0;
    dash.riskScore.textContent = score;
    dash.riskFill.style.width = (100 - clamp(score, 0, 100)) + '%';
    const lvl = riskLevel(score);
    const key = { low:'LOW', moderate:'MODERATE', high:'HIGH', critical:'CRITICAL' }[lvl];
    dash.patientRisk.dataset.level = lvl;
    dash.patientRiskLabel.textContent = t(key);
    dash.rp.textContent    = fmt(s.risk_p, 1);
    dash.rt.textContent    = fmt(s.risk_t, 1);
    dash.rm.textContent    = fmt(s.risk_m, 1);
    dash.rtemp.textContent = fmt(s.risk_temp, 1);
  }

  // Postures inferred from CoP + occupancy
  function inferPosture(s) {
    if (!s.occupied) return 'off';
    const c = s.cop || 0;
    if (c < -0.55) return 'left-lateral';
    if (c > 0.55)  return 'right-lateral';
    if (c < -0.25) return 'left-lean';
    if (c > 0.25)  return 'right-lean';
    return 'supine';
  }

  function renderRecommendations(s) {
    if (!dash.recoList) return;
    s = s || { cop: 0, occupied: false, left: { mmhg: 0 }, right: { mmhg: 0 } };
    const items = [];
    const cop     = s.cop || 0;
    const pL      = (s.left  && s.left.mmhg)  || 0;
    const pR      = (s.right && s.right.mmhg) || 0;
    const pMax    = Math.max(pL, pR);
    const pSum    = pL + pR;
    const asym    = pSum > 5 ? Math.abs(pL - pR) / pSum : 0;   // 0..1
    const mins    = s.since_turn_min || 0;
    const target  = s.turn_target_min || 120;
    const humid   = s.humidity_ok ? (s.humidity || 0) : NaN;
    const bodyT   = s.body_ok    ? (s.body_c    || 0) : NaN;
    const posture = inferPosture(s);
    const satL    = s.left  && s.left.sat;
    const satR    = s.right && s.right.sat;

    // ---- primary posture guidance ----
    if (posture === 'off') {
      items.push({ tone:'info', ic:'✓', t:t('pos_default_t'), b:t('pos_default_b') });
    } else if (posture === 'left-lateral' || posture === 'left-lean') {
      items.push({ tone:'danger', ic:'→', t:t('pos_offload_l_t'), b:t('pos_offload_l_b') + ' (CoP ' + cop.toFixed(2) + ')' });
    } else if (posture === 'right-lateral' || posture === 'right-lean') {
      items.push({ tone:'danger', ic:'←', t:t('pos_offload_r_t'), b:t('pos_offload_r_b') + ' (CoP ' + cop.toFixed(2) + ')' });
    } else {
      items.push({ tone:'ok', ic:'✓', t:t('pos_supine_t'), b:t('pos_supine_b') });
    }

    // ---- reposition timer ----
    if (posture !== 'off') {
      if (mins > target) {
        items.push({ tone:'danger', ic:'⏱', t:t('toast_reposition_t'),
                     b:t('adv_reposition_now') + ' (' + mins.toFixed(0) + ' / ' + target + ' min)' });
      } else if (mins > target * 0.75) {
        items.push({ tone:'danger', ic:'⏱', t:t('toast_reposition_t'),
                     b:t('adv_reposition_soon') + ' (' + mins.toFixed(0) + ' / ' + target + ' min)' });
      } else if (mins > target * 0.5) {
        items.push({ tone:'info', ic:'⏱', t:t('turns_title'),
                     b:'Next repositioning at ' + target + ' min (currently ' + mins.toFixed(0) + ').' });
      }
    }

    // ---- pressure-driven advice ----
    if (satL || satR) {
      items.push({ tone:'danger', ic:'!', t:t('SATURATED'), b:t('adv_saturated') });
    } else if (pMax > 100) {
      const side = pL > pR ? t('left') : t('right');
      items.push({ tone:'danger', ic:'⚠', t:t('adv_high_p'),
                   b:side + ': ' + pMax.toFixed(0) + ' mmHg' });
    } else if (pMax > 60) {
      items.push({ tone:'danger', ic:'⚠', t:t('adv_elev_p'),
                   b:'peak ' + pMax.toFixed(0) + ' mmHg' });
    }
    if (posture !== 'off' && asym > 0.4 && pSum > 40) {
      items.push({ tone:'danger', ic:'⇋', t:t('adv_one_sided'),
                   b:'asymmetry ' + (asym * 100).toFixed(0) + '%' });
    }

    // ---- environment / vitals ----
    if (!isNaN(humid) && humid > 75) {
      items.push({ tone:'danger', ic:'💧', t:t('toast_humid_t'), b:t('adv_humid') + ' (RH ' + humid.toFixed(0) + '%)' });
    } else if (!isNaN(humid) && humid > 65) {
      items.push({ tone:'info', ic:'💧', t:t('toast_humid_t'), b:t('adv_humid') + ' (RH ' + humid.toFixed(0) + '%)' });
    }
    if (!isNaN(bodyT) && bodyT > 37.5) {
      items.push({ tone:'danger', ic:'🌡', t:t('toast_temp_t'), b:t('adv_temp_high') + ' (' + bodyT.toFixed(1) + '°C)' });
    } else if (!isNaN(bodyT) && bodyT < 33 && bodyT > 28 && posture !== 'off') {
      items.push({ tone:'info', ic:'🌡', t:t('toast_temp_t'), b:t('adv_temp_low') + ' (' + bodyT.toFixed(1) + '°C)' });
    }

    // ---- always-on care reminders ----
    items.push({ tone:'info', ic:'♁', t:t('pos_heel_t'),    b:t('pos_heel_b') });
    items.push({ tone:'info', ic:'≤', t:t('pos_head_t'),    b:t('pos_head_b') });
    items.push({ tone:'info', ic:'✋', t:t('pos_hydrate_t'), b:t('pos_hydrate_b') });

    dash.recoList.innerHTML = '';
    for (const it of items) {
      const d = document.createElement('div');
      d.className = 'reco-item'; d.dataset.tone = it.tone;
      d.innerHTML = `<div class="reco-item__ic"></div>
                     <div><div class="reco-item__title"></div><div class="reco-item__body"></div></div>`;
      d.querySelector('.reco-item__ic').textContent   = it.ic;
      d.querySelector('.reco-item__title').textContent = it.t;
      d.querySelector('.reco-item__body').textContent  = it.b;
      dash.recoList.appendChild(d);
    }
  }

  // ------------------------------------------------------------
  // AI messages (rule-based, presented as AI)
  // ------------------------------------------------------------
  function aiSay(sev, text) {
    if (!dash.aiMessages) return;
    const el = document.createElement('div');
    el.className = 'ai-msg'; el.dataset.sev = sev;
    const sp = document.createElement('span'); sp.textContent = text;
    el.appendChild(sp);
    dash.aiMessages.prepend(el);
    while (dash.aiMessages.children.length > 5) dash.aiMessages.lastChild.remove();
  }
  let aiLastFingerprint = '';
  function renderAI(s) {
    if (!dash.aiMessages) return;
    dash.aiState.textContent = t('ai_ready');
    const pMax = Math.max(s.left.mmhg, s.right.mmhg);
    const bits = [];
    if (s.occupied) bits.push('occ');
    if (pMax > 100) bits.push('crit'); else if (pMax > 60) bits.push('high');
    if ((s.since_turn_min || 0) > (s.turn_target_min || 120)) bits.push('overdue');
    if (s.humidity_ok && s.humidity > 65) bits.push('humid');
    if (s.body_ok && s.body_c > 37.5) bits.push('febrile');
    if (Math.abs(s.cop || 0) > 0.6) bits.push('lean');
    const fp = bits.join('|');
    if (fp === aiLastFingerprint) return;
    aiLastFingerprint = fp;

    if (!s.occupied) {
      aiSay('info', t('adv_ok'));
    } else {
      if (pMax > 100) aiSay('danger', t('adv_high_p'));
      else if (pMax > 60) aiSay('warn', t('adv_elev_p'));
      if ((s.since_turn_min || 0) > (s.turn_target_min || 120)) aiSay('danger', t('adv_reposition_now'));
      else if ((s.since_turn_min || 0) > (s.turn_target_min || 120) * 0.75) aiSay('warn', t('adv_reposition_soon'));
      if (Math.abs(s.cop || 0) > 0.6) aiSay('warn', t('adv_one_sided'));
    }
    if (s.humidity_ok && s.humidity > 65) aiSay('warn', t('adv_humid'));
    if (s.body_ok && s.body_c > 37.5)     aiSay('warn', t('adv_temp_high'));
    if (s.body_ok && s.body_c > 28 && s.body_c < 33 && s.occupied) aiSay('warn', t('adv_temp_low'));
    if (bits.length === 0 && s.occupied) aiSay('ok', t('adv_ok'));
  }

  // ------------------------------------------------------------
  // Critical alert engine (toasts)
  // ------------------------------------------------------------
  function checkAlerts(s) {
    const pMax = Math.max(s.left.mmhg, s.right.mmhg);
    if (pMax > 100)
      toast({ sev:'danger', title:t('toast_crit_t'), body:t('adv_high_p'), key:'crit_p' });
    if ((s.since_turn_min || 0) > (s.turn_target_min || 120))
      toast({ sev:'danger', title:t('toast_reposition_t'), body:t('adv_reposition_now'), key:'reposition' });
    if (s.humidity_ok && s.humidity > 75)
      toast({ sev:'warn', title:t('toast_humid_t'), body:t('adv_humid'), key:'humid' });
    if (s.body_ok && s.body_c > 38.5)
      toast({ sev:'warn', title:t('toast_temp_t'), body:t('adv_temp_high'), key:'febrile' });
  }

  // ------------------------------------------------------------
  // Dashboard: apply state (called by WS + on view mount)
  // ------------------------------------------------------------
  function applyState(s) {
    if (!dash.leftN) return;
    renderZone('left',  s.left);
    renderZone('right', s.right);
    renderBodyMap(s.left, s.right);
    renderVitals(s);
    renderTurns(s);
    renderRisk(s);
    renderRecommendations(s);
    renderAI(s);
    checkAlerts(s);
    const conn = $('conn'); if (conn) $('connCount').textContent = s.clients > 1 ? `${s.clients}` : '';
  }

  // ------------------------------------------------------------
  // Timeline (dashboard)
  // ------------------------------------------------------------
  let hasEvents = false;
  function pushEvent(kind, text, uptime_s) {
    if (!dash.timeline) return;
    if (!hasEvents) { dash.timeline.innerHTML = ''; hasEvents = true; }
    const li = document.createElement('li');
    li.dataset.kind = kind;
    const stamp = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    li.innerHTML = `<b></b><span class="timeline__meta"></span>`;
    li.querySelector('b').textContent = text;
    li.querySelector('.timeline__meta').textContent = `${stamp}${uptime_s != null ? ' · t=' + uptime_s + 's' : ''}`;
    dash.timeline.insertBefore(li, dash.timeline.firstChild);
    while (dash.timeline.children.length > 40) dash.timeline.removeChild(dash.timeline.lastChild);
  }

  // ------------------------------------------------------------
  // PROFILE view
  // ------------------------------------------------------------
  function renderProfile() {
    mount('tpl-profile');
    const s = getSession(); if (!s) return;
    let avatarData = s.avatar || '';
    const form = $('profileForm');
    form.elements.username.value = s.username || '';
    form.elements.name.value  = s.name || '';
    form.elements.email.value = s.email || '';
    form.elements.phone.value = s.phone || '';
    form.elements.age.value   = s.age || '';
    form.elements.sex.value   = s.sex || '';
    form.elements.height.value= s.height || '';
    form.elements.weight.value= s.weight || '';
    form.elements.notes.value = s.notes || '';
    if (avatarData) $('profileAvatar').src = avatarData;

    $('profileAvatarInput').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      avatarData = await readFileAsDataURL(f, 160);
      $('profileAvatar').src = avatarData;
    });

    $('setActiveBtn').addEventListener('click', async () => {
      const r = await fetchJSON('/api/active', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ id: s.id, name: s.name || s.username })
      });
      if (r.ok) toast({ sev:'ok', title:t('set_active'), body: s.name || s.username });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      body.id = s.id;
      body.username = s.username;
      body.password = s.password || undefined;
      body.avatar = avatarData;
      const r = await fetchJSON('/api/users', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) { toast({ sev:'danger', title: t('profile_title'), body: r.body.error || 'Failed' }); return; }
      const newSession = { ...s, ...body }; setSession(newSession);
      updateHeaderForSession();
      toast({ sev:'ok', title: t('profile_title'), body: t('btn_save') });
    });
  }

  // ------------------------------------------------------------
  // ANALYSIS view (charts, KPIs, CSV/PDF)
  // ------------------------------------------------------------
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const header = lines.shift().split(',');
    return lines.map(line => {
      const cols = line.split(',');
      const o = {};
      header.forEach((h, i) => o[h.trim()] = cols[i]);
      return {
        t:    Number(o.uptime_s),
        pL:   Number(o.leftMmHg),
        pR:   Number(o.rightMmHg),
        cop:  Number(o.cop),
        turns:Number(o.turns),
        body: Number(o.bodyC),
        hum:  Number(o.humidity),
        risk: Number(o.risk),
        occ:  Number(o.occupied) ? 1 : 0,
      };
    });
  }

  let analysisTimer = null;
  function renderAnalysis() {
    mount('tpl-analysis');
    const s = getSession();
    const today = new Date(); const weekAgo = new Date(today.getTime() - 7*24*3600*1000);
    $('fromDate').valueAsDate = weekAgo;
    $('toDate').valueAsDate   = today;

    let rows = [];

    async function refresh() {
      try {
        const r = await fetch(`/api/log/${encodeURIComponent(s.id)}?_=${Date.now()}`);
        const txt = await r.text();
        rows = parseCSV(txt);
      } catch (e) {
        console.warn('log fetch failed', e); rows = [];
      }
      const fromD = $('fromDate').valueAsDate || weekAgo;
      const toD   = $('toDate').valueAsDate   || today;
      const days  = Math.max(1, Math.round((toD - fromD)/(24*3600*1000)) + 1);
      const maxSamples = days * 17280;  // 5-s cadence upper bound (86400 / 5)
      const view = rows.slice(-maxSamples);
      paintKpis(view);
      const emptyMsg = view.length < 2
        ? (lastState && lastState.active_id === s.id
            ? 'Waiting for first sample (log cadence 5 s)…'
            : 'No log for this patient yet. Open Profile → "Monitor this patient" to start recording, or wait a few seconds after login.')
        : null;
      drawChart('chartPressure', view, [
        { key:'pL', label:'Left mmHg',  cls:'chart-line--a' },
        { key:'pR', label:'Right mmHg', cls:'chart-line--b' },
      ], { yMax: 150, emptyMsg });
      drawChart('chartRisk', view, [{ key:'risk', label:'Risk', cls:'chart-line--c' }], { yMax: 100, emptyMsg });
      drawChart('chartEnv',  view, [
        { key:'body', label:'Body °C',   cls:'chart-line--a' },
        { key:'hum',  label:'Humidity %', cls:'chart-line--b' },
      ], { emptyMsg });
      drawChart('chartCop',  view, [{ key:'cop', label:'CoP', cls:'chart-line--a' }], { yMin:-1, yMax:1, emptyMsg });
    }

    $('fromDate').addEventListener('change', refresh);
    $('toDate').addEventListener('change', refresh);
    $('exportCsv').addEventListener('click', () => {
      const header = 'uptime_s,leftMmHg,rightMmHg,cop,turns,bodyC,humidity,risk,occupied\n';
      const body = rows.map(r => [r.t, r.pL, r.pR, r.cop, r.turns, r.body, r.hum, r.risk, r.occ].join(',')).join('\n');
      download(`ulcershield_${s.username}_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv', header + body);
    });
    $('exportPdf').addEventListener('click', () => window.print());
    refresh();
    if (analysisTimer) clearInterval(analysisTimer);
    analysisTimer = setInterval(refresh, 30000);   // auto-refresh
  }

  function paintKpis(rows) {
    const n = rows.length;
    $('kpiSamples').textContent = n;
    if (n === 0) { ['kpiAvg','kpiMax','kpiTurns','kpiRisk','kpiOcc'].forEach(id => $(id).textContent = '—'); return; }
    let avgP=0, maxP=0, avgR=0, occ=0;
    for (const r of rows) {
      const p = Math.max(r.pL||0, r.pR||0);
      avgP += p; if (p > maxP) maxP = p;
      avgR += r.risk || 0; if (r.occ) occ++;
    }
    $('kpiAvg').textContent   = (avgP / n).toFixed(1);
    $('kpiMax').textContent   = maxP.toFixed(0);
    $('kpiTurns').textContent = (rows[rows.length-1].turns | 0);
    $('kpiRisk').textContent  = (avgR / n).toFixed(0);
    $('kpiOcc').textContent   = ((occ/n)*100).toFixed(0) + '%';
  }

  function drawChart(containerId, rows, series, opts) {
    opts = opts || {};
    const host = $(containerId); if (!host) return;
    host.innerHTML = '';
    const W = 800, H = 260, PAD = { l: 44, r: 12, t: 10, b: 26 };
    const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
    const N = rows.length;
    if (N < 2) {
      const msg = opts.emptyMsg || 'No data yet';
      host.innerHTML =
        `<div style="display:grid;place-items:center;height:100%;color:var(--c-muted);
                     font-size:.85rem;text-align:center;padding:0 16px">${msg}</div>`;
      return;
    }
    let yMin = opts.yMin, yMax = opts.yMax;
    if (yMin === undefined || yMax === undefined) {
      let lo = Infinity, hi = -Infinity;
      for (const r of rows) for (const s of series) {
        const v = r[s.key]; if (!Number.isFinite(v)) continue;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      if (!isFinite(lo)) { lo = 0; hi = 1; }
      if (hi === lo) hi = lo + 1;
      const pad = (hi - lo) * 0.1;
      yMin = (yMin === undefined) ? (lo - pad) : yMin;
      yMax = (yMax === undefined) ? (hi + pad) : yMax;
    }
    const x = (i) => PAD.l + (i / (N-1)) * iw;
    const y = (v) => PAD.t + ih - ((v - yMin) / (yMax - yMin)) * ih;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
    // grid
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const yy = PAD.t + (ih * i / yTicks);
      const val = yMax - (yMax - yMin) * (i / yTicks);
      svg += `<line class="chart-grid" x1="${PAD.l}" x2="${W-PAD.r}" y1="${yy}" y2="${yy}"/>`;
      svg += `<text class="chart-tick" x="${PAD.l-6}" y="${yy+3}" text-anchor="end">${val.toFixed(1)}</text>`;
    }
    svg += `<line class="chart-axis" x1="${PAD.l}" x2="${W-PAD.r}" y1="${H-PAD.b}" y2="${H-PAD.b}"/>`;
    svg += `<line class="chart-axis" x1="${PAD.l}" x2="${PAD.l}" y1="${PAD.t}" y2="${H-PAD.b}"/>`;
    // x labels: first, middle, last
    const xl = [0, Math.floor(N/2), N-1];
    xl.forEach(i => {
      const tsec = rows[i].t;
      const label = fmtDur(tsec);
      svg += `<text class="chart-tick" x="${x(i)}" y="${H-PAD.b+16}" text-anchor="middle">${label}</text>`;
    });
    // series
    for (const s of series) {
      let d = ''; let started = false;
      for (let i = 0; i < N; i++) {
        const v = rows[i][s.key]; if (!Number.isFinite(v)) continue;
        d += (started ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1) + ' ';
        started = true;
      }
      svg += `<path class="chart-line ${s.cls}" d="${d}"/>`;
    }
    svg += `</svg>`;

    // legend
    let legend = `<div class="chart-legend">`;
    for (let i = 0; i < series.length; i++) {
      const cls = ['a','b','c'][i] || 'a';
      legend += `<span class="${cls}">${series[i].label}</span>`;
    }
    legend += `</div>`;
    host.innerHTML = svg + legend;
  }
  function fmtDur(sec) {
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.round(sec/60) + 'm';
    if (sec < 86400) return (sec/3600).toFixed(1) + 'h';
    return (sec/86400).toFixed(1) + 'd';
  }

  // ------------------------------------------------------------
  // WebSocket
  // ------------------------------------------------------------
  const WS_URL = `ws://${location.hostname || '192.168.4.1'}/ws`;
  const OFFLINE_MS       = 8000;   // stream-stall threshold
  const OFFLINE_GRACE_MS = 6000;   // don't complain in first N ms after WS open
  const OFFLINE_RECOVER_MS = 12000;// force reconnect if we've been offline this long
  let ws = null, lastMsgAt = 0, wsOpenedAt = 0, offlineSince = 0, reconnectDelay = 800;
  let lastState = null;

  function setConnState(state) {
    currentConnState = state;
    const conn = $('conn'); if (!conn) return;
    conn.dataset.state = state;
    const txt = $('connText');
    if (txt) txt.textContent =
      state === 'connected'    ? t('conn_connected')
    : state === 'disconnected' ? t('conn_disconnected')
    :                            t('conn_connecting');
  }

  function connect() {
    setConnState('connecting');
    console.log('[US] WS connecting →', WS_URL);
    try { ws = new WebSocket(WS_URL); }
    catch (e) { console.warn('[US] WS ctor failed', e); scheduleReconnect(); return; }
    ws.onopen = () => {
      console.log('[US] WS open');
      setConnState('connected');
      lastMsgAt = Date.now(); wsOpenedAt = Date.now(); offlineSince = 0;
      reconnectDelay = 800;
      hideOffline();
      pushEvent('calibration', t('ev_connected'));
    };
    ws.onclose = (ev) => {
      console.warn('[US] WS close', ev.code, ev.reason);
      setConnState('disconnected');
      pushEvent('alert', t('ev_disconnected'));
      // Only toast if we've actually been connected before; otherwise it fires on every
      // reconnect attempt during boot and spams the screen.
      if (wsOpenedAt) toast({ sev:'warn', title:t('toast_offline_t'), body:t('conn_disconnected'), key:'offline' });
      scheduleReconnect();
    };
    ws.onerror = (e) => { console.warn('[US] WS error', e); try { ws.close(); } catch {} };
    ws.onmessage = (ev) => {
      lastMsgAt = Date.now();
      hideOffline();
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === 'state') { lastState = m; applyState(m); }
      else if (m.type === 'event') {
        const label =
          m.kind === 'turn'        ? `${t('ev_turn')} · ${m.text}`
        : m.kind === 'calibration' ? `${t('ev_calibration')} · ${m.text}`
        : m.kind === 'reset'       ? t('ev_reset')
        : m.kind === 'active_user' ? `${t('ev_active_user')}: ${m.text}`
        :                            (m.text || m.kind);
        pushEvent(m.kind, label, m.uptime_s);
        if (m.kind === 'turn') toast({ sev:'ok', title:t('ev_turn'), body:m.text });
      }
    };
  }
  function scheduleReconnect() {
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.6, 8000);
  }
  function showOffline(ageMs, reason) {
    const b = $('offlineBanner'); if (!b) return;
    b.hidden = false;
    const ageTxt = ageMs != null ? `— ${Math.round(ageMs/1000)}s` : '';
    const rsn    = reason ? ` · ${reason}` : '';
    $('offlineAge').textContent = ageTxt + rsn;
    if (!offlineSince) offlineSince = Date.now();
  }
  function hideOffline() {
    const b = $('offlineBanner'); if (!b) return;
    b.hidden = true; $('offlineAge').textContent = '';
    offlineSince = 0;
  }
  function forceReconnect(reason) {
    console.warn('[US] forcing WS reconnect:', reason);
    try { if (ws) ws.close(); } catch {}
    reconnectDelay = 500;
    // ws.onclose will call scheduleReconnect
  }
  setInterval(() => {
    // Not connected yet? Don't blame the sensor stream.
    if (!wsOpenedAt) return;
    // Grace period right after connect
    if (Date.now() - wsOpenedAt < OFFLINE_GRACE_MS) return;

    const age = Date.now() - lastMsgAt;
    const wsClosed = !ws || ws.readyState !== 1;

    if (wsClosed) {
      showOffline(null, 'WebSocket disconnected');
    } else if (age > OFFLINE_MS) {
      showOffline(age, 'stream stalled');
      if (offlineSince && Date.now() - offlineSince > OFFLINE_RECOVER_MS) {
        forceReconnect('offline > ' + OFFLINE_RECOVER_MS + 'ms');
      }
    } else {
      hideOffline();
    }
  }, 1000);

  // Manual retry from the banner
  const retryBtn = $('offlineRetry');
  if (retryBtn) retryBtn.addEventListener('click', () => forceReconnect('user clicked Retry'));

  function sendCmd(cmd) {
    if (ws && ws.readyState === 1) ws.send(cmd);
    else toast({ sev:'warn', title:t('toast_offline_t'), body:t('conn_disconnected') });
  }

  // ------------------------------------------------------------
  // Header controls
  // ------------------------------------------------------------
  $('themeBtn').addEventListener('click', () => {
    theme = (theme === 'light') ? 'dark' : 'light';
    localStorage.setItem('us_theme', theme); applyTheme();
  });
  $('fontBtn').addEventListener('click', () => {
    const order = ['s','m','l','xl'];
    fontSize = order[(order.indexOf(fontSize)+1) % order.length];
    localStorage.setItem('us_fs', fontSize); applyFontSize();
  });
  $('langBtn').addEventListener('click', () => {
    lang = LANG_ORDER[(LANG_ORDER.indexOf(lang)+1) % LANG_ORDER.length];
    localStorage.setItem('us_lang', lang);
    applyI18n();
    if (lastState && dash.leftN) applyState(lastState);
    if (dash.recoList) renderRecommendations(lastState || { cop: 0, occupied: false, left: { mmhg: 0 }, right: { mmhg: 0 } });
  });
  $('logoutBtn').addEventListener('click', () => {
    clearSession(); location.hash = '/login';
  });

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  applyTheme(); applyFontSize(); applyI18n();
  if (!location.hash) location.hash = getSession() ? '/dashboard' : '/login';
  navigate();
  connect();
})();
