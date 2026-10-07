import importlib.util
from pathlib import Path
from collections import namedtuple
import unittest
from unittest.mock import patch
import json
spec=importlib.util.spec_from_file_location('health',Path(__file__).parents[2]/'ops/server/scripts/storage_health.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
Usage=namedtuple('Usage','total used free')
class HealthTests(unittest.TestCase):
    def check(self,percent,backup=None,failures=None):
        return m.inspect_health(200000,Usage(100*1024**3,percent*1024**3,(100-percent)*1024**3),backup or {'verifiedAt':200000,'latest':{'uploads':200000,'database':200000},'cloudBytes':10*1024**3},failures or {},100*1024**3)
    def test_disk_levels(self):
        for p,level in [(40,0),(70,1),(80,2),(90,3),(100,3)]:self.assertEqual(self.check(p)[0],level)
    def test_stale_cloud_verification(self):
        self.assertEqual(self.check(40,{'verifiedAt':1,'latest':{'uploads':200000,'database':200000}})[0],2)
    def test_upload_failure_alert(self):
        self.assertEqual(self.check(40,failures={'uploads':{'failedAt':200001}})[0],2)
    def test_old_failure_clears_when_new_backup_verified(self):
        self.assertEqual(self.check(40,failures={'uploads':{'failedAt':100000}})[0],0)
    def test_cos_quota_warning(self):
        self.assertEqual(self.check(40,{'verifiedAt':200000,'latest':{'uploads':200000,'database':200000},'cloudBytes':81*1024**3})[0],2)
    def test_wecom_rejection_is_not_success(self):
        with patch.object(m.urllib.request,'urlopen') as mock:
            mock.return_value.__enter__.return_value.read.return_value=json.dumps({'errcode':93000}).encode()
            with self.assertRaises(RuntimeError):m.send_alert('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test','test')
    def test_missing_channel_is_not_success(self):
        with self.assertRaises(RuntimeError):m.send_alert('','test')
    def test_low_absolute_space_critical(self):
        status=m.inspect_health(200000,Usage(2*1024**3,1024**3,1024**3),{'verifiedAt':200000,'latest':{'uploads':200000,'database':200000}}, {},100*1024**3)
        self.assertEqual(status[0],3)
if __name__=='__main__':unittest.main()
