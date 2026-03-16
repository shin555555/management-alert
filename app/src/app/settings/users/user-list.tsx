"use client";

/**
 * ユーザー管理 クライアントコンポーネント
 *
 * スタッフの一覧表示・新規追加・パスワード変更・削除を行う。
 */

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, KeyRound, Trash2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Role } from "@prisma/client";
import {
  createUser,
  updateUserPassword,
  deleteUser,
  type UserListItem,
} from "./actions";

interface UserListProps {
  initialUsers: UserListItem[];
  currentUserId: string;
}

export function UserList({ initialUsers, currentUserId }: UserListProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 新規追加フォーム
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>(Role.STAFF);

  // パスワード変更フォーム
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const refresh = () => router.refresh();

  // ========== 新規追加 ==========
  const handleAddOpen = () => {
    setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole(Role.STAFF);
    setErrorMsg(null);
    setIsAddOpen(true);
  };

  const handleCreate = () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setErrorMsg("すべての項目を入力してください");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("パスワードは8文字以上にしてください");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const result = await createUser({ name: newName.trim(), email: newEmail.trim(), password: newPassword, role: newRole });
      if (result.success) {
        setIsAddOpen(false);
        refresh();
      } else {
        setErrorMsg(result.error ?? "追加に失敗しました");
      }
    });
  };

  // ========== パスワード変更 ==========
  const handlePasswordOpen = (user: UserListItem) => {
    setNewPw(""); setConfirmPw(""); setErrorMsg(null);
    setPasswordTarget(user);
  };

  const handlePasswordSave = () => {
    if (!newPw) { setErrorMsg("新しいパスワードを入力してください"); return; }
    if (newPw.length < 8) { setErrorMsg("パスワードは8文字以上にしてください"); return; }
    if (newPw !== confirmPw) { setErrorMsg("パスワードが一致しません"); return; }
    setErrorMsg(null);
    startTransition(async () => {
      const result = await updateUserPassword({ userId: passwordTarget!.id, newPassword: newPw });
      if (result.success) {
        setPasswordTarget(null);
      } else {
        setErrorMsg(result.error ?? "変更に失敗しました");
      }
    });
  };

  // ========== 削除 ==========
  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUser(deleteTarget!.id);
      if (result.success) {
        setDeleteTarget(null);
        refresh();
      } else {
        setErrorMsg(result.error ?? "削除に失敗しました");
        setDeleteTarget(null);
      }
    });
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddOpen} className="gap-2">
          <Plus className="w-4 h-4" />
          スタッフを追加
        </Button>
      </div>

      {/* ユーザー一覧テーブル */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>権限</TableHead>
            <TableHead>登録日</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium flex items-center gap-2">
                {user.role === "ADMIN"
                  ? <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  : <User className="w-4 h-4 text-muted-foreground shrink-0" />
                }
                {user.name}
                {user.id === currentUserId && (
                  <Badge variant="secondary" className="text-[10px]">自分</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                  {user.role === "ADMIN" ? "管理者" : "スタッフ"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString("ja-JP")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePasswordOpen(user)}
                    className="gap-1.5 text-xs"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    PW変更
                  </Button>
                  {user.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setErrorMsg(null); setDeleteTarget(user); }}
                      className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      削除
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ========== 新規追加ダイアログ ========== */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>スタッフを追加</DialogTitle>
            <DialogDescription>新しいスタッフアカウントを作成します。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>名前 *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例: 田中 花子" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>メールアドレス *</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="例: hanako@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>パスワード * <span className="text-muted-foreground text-xs">（8文字以上）</span></Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>権限</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.STAFF}>スタッフ（閲覧・更新のみ）</SelectItem>
                  <SelectItem value={Role.ADMIN}>管理者（全操作・設定変更可）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isPending}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "追加中..." : "追加する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== パスワード変更ダイアログ ========== */}
      <Dialog open={!!passwordTarget} onOpenChange={(o) => !o && setPasswordTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>パスワード変更</DialogTitle>
            <DialogDescription>{passwordTarget?.name} のパスワードを変更します。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>新しいパスワード * <span className="text-muted-foreground text-xs">（8文字以上）</span></Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>確認用パスワード *</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
            </div>
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordTarget(null)} disabled={isPending}>キャンセル</Button>
            <Button onClick={handlePasswordSave} disabled={isPending}>
              {isPending ? "変更中..." : "変更する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== 削除確認ダイアログ ========== */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>スタッフの削除</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
