Pod::Spec.new do |s|
  s.name = 'BubuDuduCalendarWidget'
  s.version = '1.0.0'
  s.summary = 'Private Calendar snapshot bridge'
  s.description = 'Minimal App Group bridge for the BubuDudu WidgetKit extension.'
  s.license = { :type => 'MIT' }
  s.author = 'BubuDudu'
  s.homepage = 'https://expo.dev'
  s.platform = :ios, '15.1'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.swift'
  s.swift_version = '5.0'
end
