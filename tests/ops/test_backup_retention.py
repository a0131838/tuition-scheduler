import hashlib
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('backup', Path(__file__).parents[2] / 'ops/server/scripts/verified_backup_retention.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class FakeCloud:
    prefix = 'tuition-scheduler/backups/'
    def __init__(self, files):
        self.objects = {self.prefix+p.name: {'Key':self.prefix+p.name,'Size':p.stat().st_size,'ETag':hashlib.md5(p.read_bytes()).hexdigest()} for p in files}
    def listing(self): return list(self.objects.values())
    def head(self, name): return self.objects[self.prefix+name]
    def upload(self, path, md5, sha): self.objects[self.prefix+path.name]={'Key':self.prefix+path.name,'Size':path.stat().st_size,'ETag':md5}

class RetentionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.files=[]
        for day in range(1,10):
            p=self.root/f'tuition-scheduler_uploads_202610{day:02}_023001.tar.gz';p.write_bytes(f'archive{day}'.encode());self.files.append(p)
        self.cloud=FakeCloud(self.files)
    def tearDown(self): self.tmp.cleanup()
    def run_case(self,**kwargs): return m.reconcile(self.root,self.cloud,emit=lambda *a,**k:None,**kwargs)
    def test_dry_run(self):
        self.run_case();self.assertTrue(all(p.exists() for p in self.files))
    def test_only_verified_old_duplicates_removed(self):
        other=self.root/'important.jpg';other.write_bytes(b'keep')
        result=self.run_case(apply=True)
        self.assertEqual(sum(p.exists() for p in self.files),7);self.assertTrue(other.exists());self.assertEqual(len(self.cloud.objects),9);self.assertGreater(result['freedBytes'],0)
    def test_missing_stops_all_removal(self):
        del self.cloud.objects[self.cloud.prefix+self.files[-1].name]
        with self.assertRaises(RuntimeError):self.run_case(apply=True)
        self.assertTrue(all(p.exists() for p in self.files))
    def test_mismatch_stops_all_removal(self):
        self.cloud.objects[self.cloud.prefix+self.files[-1].name]['ETag']='bad'
        with self.assertRaises(RuntimeError):self.run_case(apply=True)
        self.assertTrue(all(p.exists() for p in self.files))
    def test_upload_missing_then_verify(self):
        self.cloud.objects.clear();self.run_case(apply=True,upload_missing=True);self.assertEqual(len(self.cloud.objects),9)
    def test_head_change_prevents_removal(self):
        self.cloud.head=lambda name:{'Size':1,'ETag':'wrong'}
        with self.assertRaises(RuntimeError):self.run_case(apply=True)
        self.assertTrue(all(p.exists() for p in self.files))
    def test_symlink_ignored(self):
        p=self.files[0];p.unlink();p.symlink_to(self.files[-1]);self.run_case(apply=True);self.assertTrue(p.is_symlink());self.assertTrue(self.files[-1].exists())
    def test_invalid_keep_rejected(self):
        with self.assertRaises(ValueError):self.run_case(keep=0,apply=True)
    def test_multipart_etag_not_assumed_equal(self):
        self.assertFalse(m.matches_cloud({'Size':8,'ETag':'abcd-2'},8,'abcd'))

if __name__=='__main__':unittest.main()
